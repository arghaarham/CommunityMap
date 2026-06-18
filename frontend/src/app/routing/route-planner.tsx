"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigation,
  MapPin,
  Route,
  Info,
  CheckSquare,
  Square,
  Loader2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Map, MapControls, MapMarker } from "@/components/ui/map";
import { Source, Layer } from "react-map-gl/maplibre";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getOptimalRoute } from "@/lib/api/client";
import type { RoutingReport, RouteResult, AStarIteration } from "@/lib/api/client";

const STATUS_PRIORITY: Record<string, number> = {
  new: 0,
  verified: 1,
  in_progress: 2,
  resolved: 3,
};

// Default center: Bandung
const DEFAULT_LAT = -6.9175;
const DEFAULT_LNG = 107.6191;

/**
 * Fetch actual road geometry from OSRM public API.
 * Used to draw road-following route on map (not straight lines).
 * The A* algorithm still determines the ORDER of visits.
 */
async function fetchOsrmRoute(
  waypoints: Array<{ lat: number; lng: number }>,
): Promise<[number, number][]> {
  if (waypoints.length < 2) return [];

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return waypoints.map((w) => [w.lng, w.lat]);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
      return waypoints.map((w) => [w.lng, w.lat]);
    }
    return data.routes[0].geometry.coordinates as [number, number][];
  } catch {
    // Fallback to straight lines if OSRM fails
    return waypoints.map((w) => [w.lng, w.lat]);
  }
}

export function RoutePlanner({
  initialReports,
  preSelectedIds = [],
  preStartLat,
  preStartLng,
}: {
  initialReports: RoutingReport[];
  preSelectedIds?: string[];
  preStartLat?: number;
  preStartLng?: number;
}) {
  const [reports, setReports] = useState<RoutingReport[]>(initialReports);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelectedIds));
  const [startLat, setStartLat] = useState(preStartLat ?? DEFAULT_LAT);
  const [startLng, setStartLng] = useState(preStartLng ?? DEFAULT_LNG);
  const [startLabel, setStartLabel] = useState(
    preStartLat && preStartLng
      ? `${preStartLat.toFixed(5)}, ${preStartLng.toFixed(5)}`
      : "Posisi default (Bandung)",
  );
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIterations, setShowIterations] = useState(false);
  const [activeIterationIdx, setActiveIterationIdx] = useState<number | null>(null);
  const [viewport, setViewport] = useState({
    longitude: preStartLng ?? DEFAULT_LNG,
    latitude: preStartLat ?? DEFAULT_LAT,
    zoom: preStartLat ? 13 : 10,
  });
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roadSegments, setRoadSegments] = useState<Array<{ coords: [number, number][]; color: string }>>([]);
  const [fetchingReports, setFetchingReports] = useState(false);
  const locatingRef = useRef(false);

  // Client-side fetch fallback if server-side returned nothing
  useEffect(() => {
    if (initialReports.length === 0) {
      setFetchingReports(true);
      fetch("/api/routing/reports")
        .then((r) => r.json())
        .then((json) => {
          if (Array.isArray(json.data) && json.data.length > 0) {
            setReports(json.data);
          }
        })
        .catch(() => {})
        .finally(() => setFetchingReports(false));
    }
  }, [initialReports.length]);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchSearch =
      searchFilter.trim().length === 0 ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.address.toLowerCase().includes(searchFilter.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sortedFiltered = [...filteredReports].sort(
    (a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9),
  );

  function toggleReport(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
    setRoadSegments([]);
    setError(null);
  }

  function selectAll() {
    setSelectedIds(new Set(filteredReports.map((r) => r.id)));
    setResult(null);
    setRoadSegments([]);
  }

  function clearAll() {
    setSelectedIds(new Set());
    setResult(null);
    setRoadSegments([]);
  }

  const handleLocate = useCallback(() => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartLat(pos.coords.latitude);
        setStartLng(pos.coords.longitude);
        setStartLabel("Lokasi GPS Anda");
        setViewport({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: 13,
        });
        locatingRef.current = false;
      },
      () => {
        locatingRef.current = false;
      },
    );
  }, []);

  async function handleCalculate() {
    if (selectedIds.size === 0) {
      setError("Pilih minimal satu laporan terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setRoadSegments([]);
    setShowIterations(false);
    setActiveIterationIdx(null);
    try {
      const res = await getOptimalRoute(startLat, startLng, Array.from(selectedIds));
      setResult(res);

      const ROUTE_COLORS = [
        "#0ea5e9", // blue
        "#f43f5e", // rose
        "#eab308", // yellow
        "#8b5cf6", // violet
        "#f97316", // orange
        "#14b8a6", // teal
        "#ec4899", // pink
        "#84cc16", // lime
      ];

      // Fetch road-following route from OSRM per segment
      const nodes = [
        { lat: startLat, lng: startLng },
        ...res.path.map((n) => ({ lat: n.lat, lng: n.lng })),
      ];
      
      const segmentPromises = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const w1 = nodes[i];
        const w2 = nodes[i + 1];
        segmentPromises.push(
          fetchOsrmRoute([w1, w2]).then((coords) => ({
            coords,
            color: ROUTE_COLORS[i % ROUTE_COLORS.length],
          }))
        );
      }
      
      const segments = await Promise.all(segmentPromises);
      setRoadSegments(segments);

      // Fit map to show all nodes
      if (res.path.length > 0) {
        const allLngs = [startLng, ...res.path.map((n) => n.lng)];
        const allLats = [startLat, ...res.path.map((n) => n.lat)];
        const midLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
        const midLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
        setViewport({ longitude: midLng, latitude: midLat, zoom: 11 });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan saat menghitung rute.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="route-planner-grid">
      {/* ── LEFT PANEL: Report Selector ── */}
      <aside className="left-panel">
        <div className="panel-header">
          <div className="panel-title-row">
            <Route className="panel-icon" />
            <h2 className="panel-title">Pilih Laporan</h2>
          </div>
          <p className="panel-subtitle">Centang laporan yang ingin ditinjau petugas</p>
        </div>

        {/* Filters */}
        <div className="filter-section">
          <input
            className="search-input"
            placeholder="Cari laporan..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <select
            className="status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="new">Baru</option>
            <option value="verified">Terverifikasi</option>
            <option value="in_progress">Dalam Proses</option>
            <option value="resolved">Selesai</option>
          </select>
          <div className="select-all-row">
            <button className="select-all-btn" onClick={selectAll}>
              Pilih Semua ({filteredReports.length})
            </button>
            <button className="clear-btn" onClick={clearAll}>
              Hapus
            </button>
          </div>
        </div>

        {/* Report list */}
        <div className="report-list">
          {fetchingReports && (
            <div className="loading-reports">
              <Loader2 className="size-4 animate-spin" />
              <span>Memuat laporan...</span>
            </div>
          )}
          {!fetchingReports && sortedFiltered.length === 0 && (
            <p className="empty-msg">
              {reports.length === 0
                ? "Tidak ada laporan aktif saat ini."
                : "Tidak ada laporan cocok dengan filter."}
            </p>
          )}
          {sortedFiltered.map((report) => {
            const isSelected = selectedIds.has(report.id);
            const routeNode = result?.path.find((n) => n.id === report.id);
            return (
              <button
                key={report.id}
                className={cn("report-item", isSelected && "report-item--selected")}
                onClick={() => toggleReport(report.id)}
                title={report.title}
              >
                <span className="report-check">
                  {isSelected ? (
                    <CheckSquare className="check-icon check-icon--active" />
                  ) : (
                    <Square className="check-icon" />
                  )}
                </span>
                <span className="report-info">
                  <span className="report-title">{report.title}</span>
                  <span className="report-address">{report.address || report.district}</span>
                  {routeNode && (
                    <span className="route-order-badge">#{routeNode.order}</span>
                  )}
                </span>
                <StatusBadge
                  status={
                    report.status as
                      | "new"
                      | "verified"
                      | "in_progress"
                      | "resolved"
                      | "rejected"
                  }
                />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="selected-footer">
          <span className="selected-count">{selectedIds.size} laporan dipilih</span>
          <button
            className={cn("calculate-btn", loading && "calculate-btn--loading")}
            onClick={handleCalculate}
            disabled={loading || selectedIds.size === 0}
          >
            {loading ? (
              <>
                <Loader2 className="btn-icon animate-spin" />
                Menghitung...
              </>
            ) : (
              <>
                <Navigation className="btn-icon" />
                Hitung Rute A*
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── MIDDLE PANEL: Map ── */}
      <div className="map-panel">
        {/* Toolbar */}
        <div className="map-toolbar">
          <div className="toolbar-inner">
            <MapPin className="toolbar-icon" />
            <span className="toolbar-label">Posisi Awal:</span>
            <span className="toolbar-value">{startLabel}</span>
            <button className="toolbar-btn" onClick={handleLocate} title="Gunakan lokasi GPS">
              <Crosshair className="size-4" />
            </button>
            <button
              className="toolbar-btn"
              onClick={() => {
                setStartLat(DEFAULT_LAT);
                setStartLng(DEFAULT_LNG);
                setStartLabel("Posisi default (Bandung)");
                setResult(null);
                setRoadSegments([]);
              }}
              title="Reset posisi"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
          <p className="toolbar-hint">Drag pin hijau untuk ubah posisi petugas · Klik peta untuk set posisi</p>
        </div>

        <Map
          viewport={viewport}
          onViewportChange={setViewport}
          className="route-map"
          onMapClick={(coords) => {
            setStartLat(coords.latitude);
            setStartLng(coords.longitude);
            setStartLabel(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
            setResult(null);
            setRoadSegments([]);
          }}
        >
          <MapControls position="top-right" />

          {/* Road-following route segments from OSRM */}
          {roadSegments.map((segment, idx) => (
            <Source
              key={`segment-${idx}`}
              id={`road-route-${idx}`}
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: segment.coords },
              }}
            >
              {/* Road outline */}
              <Layer
                id={`road-route-outline-${idx}`}
                type="line"
                paint={{
                  "line-color": "#ffffff",
                  "line-width": 6,
                  "line-opacity": 0.9,
                }}
              />
              {/* Route line */}
              <Layer
                id={`road-route-line-${idx}`}
                type="line"
                paint={{
                  "line-color": segment.color,
                  "line-width": 4,
                  "line-opacity": 1,
                }}
              />
            </Source>
          ))}

          {/* Start marker (draggable) */}
          <MapMarker
            longitude={startLng}
            latitude={startLat}
            draggable
            onDragEnd={(coords) => {
              setStartLat(coords.latitude);
              setStartLng(coords.longitude);
              setStartLabel(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
              setResult(null);
              setRoadSegments([]);
            }}
          >
            <div className="start-marker">
              <Navigation className="size-5" />
              <span className="start-marker-label">Petugas</span>
            </div>
          </MapMarker>

          {/* Report markers */}
          {reports.map((report) => {
            const isSelected = selectedIds.has(report.id);
            const routeNode = result?.path.find((n) => n.id === report.id);
            return (
              <MapMarker
                key={report.id}
                longitude={report.lng}
                latitude={report.lat}
                onClick={() => toggleReport(report.id)}
              >
                <div
                  className={cn(
                    "report-marker",
                    isSelected && "report-marker--selected",
                    routeNode && "report-marker--in-route",
                  )}
                  title={report.title}
                >
                  {routeNode ? (
                    <span className="marker-order">{routeNode.order}</span>
                  ) : (
                    <MapPin className="size-3.5" />
                  )}
                </div>
              </MapMarker>
            );
          })}
        </Map>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot--start" />
            <span>Petugas</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--selected" />
            <span>Dipilih</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--route" />
            <span>Dalam Rute</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--default" />
            <span>Lainnya</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: A* Result ── */}
      <aside className="right-panel">


        {error && (
          <div className="error-card">
            <AlertCircle className="error-icon" />
            <p className="error-text">{error}</p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="empty-result">
            <Route className="empty-icon" />
            <p className="empty-title">Rute belum dihitung</p>
            <p className="empty-desc">
              Pilih laporan di panel kiri, atur posisi petugas, lalu klik{" "}
              <strong>Hitung Rute A*</strong>
            </p>
          </div>
        )}

        {loading && (
          <div className="loading-result">
            <Loader2 className="loading-icon animate-spin" />
            <p>Menjalankan algoritma A*...</p>
          </div>
        )}

        {result && (
          <>
            {/* Summary */}
            <div className="result-summary">
              <div className="summary-stat">
                <span className="stat-value">{result.path.length}</span>
                <span className="stat-label">Laporan</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-stat">
                <span className="stat-value">{result.totalDistance.toFixed(2)}</span>
                <span className="stat-label">km (udara)</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-stat">
                <span className="stat-value">{result.iterations.length}</span>
                <span className="stat-label">Iterasi</span>
              </div>
            </div>

            {/* Ordered path */}
            <div className="path-section">
              <h3 className="section-title">Urutan Kunjungan Optimal</h3>
              <div className="path-list">
                {/* Start */}
                <div className="path-item path-item--start">
                  <div className="path-node path-node--start">
                    <Navigation className="size-3.5" />
                  </div>
                  <div className="path-info">
                    <p className="path-name">Posisi Petugas</p>
                    <p className="path-coords">
                      {result.startPoint.lat.toFixed(5)}, {result.startPoint.lng.toFixed(5)}
                    </p>
                  </div>
                </div>

                {result.path.map((node, i) => {
                  const colorIndex = i % 8;
                  const ROUTE_COLORS = [
                    "#0ea5e9", "#f43f5e", "#eab308", "#8b5cf6",
                    "#f97316", "#14b8a6", "#ec4899", "#84cc16"
                  ];
                  return (
                  <div key={node.id} className="path-item">
                    <div className="path-connector" style={{ background: ROUTE_COLORS[colorIndex] }} />
                    <div className="path-distance-label">+{node.distanceFromPrev.toFixed(2)} km</div>
                    <div className="path-node" style={{ background: ROUTE_COLORS[colorIndex] }}>{node.order}</div>
                    <div className="path-info">
                      <p className="path-name">{node.title}</p>
                      <p className="path-id">{node.id}</p>
                      <p className="path-cumulative">Total: {node.cumulativeDistance.toFixed(2)} km</p>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* A* Iterations Table */}
            <div className="iterations-section">
              <button
                className="iterations-toggle"
                onClick={() => setShowIterations((v) => !v)}
              >
                <span>Tabel Iterasi A* ({result.iterations.length} iterasi)</span>
                {showIterations ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {showIterations && (
                <div className="iterations-content">
                  <p className="iterations-note">
                    Tabel ini menampilkan langkah-langkah ekspansi simpul A*.
                  </p>
                  {result.iterations.map((iter) => (
                    <IterationCard
                      key={iter.iterasi}
                      iteration={iter}
                      isActive={activeIterationIdx === iter.iterasi - 1}
                      onClick={() =>
                        setActiveIterationIdx(
                          activeIterationIdx === iter.iterasi - 1 ? null : iter.iterasi - 1,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function IterationCard({
  iteration,
  isActive,
  onClick,
}: {
  iteration: AStarIteration;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div className={cn("iteration-card", isActive && "iteration-card--active")}>
      <button className="iteration-header" onClick={onClick}>
        <span className="iteration-number">Iterasi {iteration.iterasi}</span>
        <span className="iteration-from">dari: {iteration.dari}</span>
        <span className="iteration-expand">
          Ekspansi: <strong>{iteration.simpulEkspanTitle}</strong>
        </span>
      </button>

      {isActive && (
        <div className="iteration-body">
          <p className="iteration-subtitle">Simpul Hidup (Open List):</p>
          <div className="table-wrapper">
            <table className="astar-table">
              <thead>
                <tr>
                  <th>Laporan</th>
                  <th>g(n)</th>
                  <th>h(n)</th>
                  <th>f(n)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {iteration.simpulHidup.map((node) => (
                  <tr
                    key={node.id}
                    className={cn(
                      node.id === iteration.simpulEkspan && "table-row--chosen",
                    )}
                  >
                    <td className="node-title-cell">{node.title}</td>
                    <td className="g-cell">{node.gn.toFixed(3)}</td>
                    <td className="h-cell">{node.hn.toFixed(3)}</td>
                    <td className="f-cell">{node.fn.toFixed(3)}</td>
                    <td>
                      {node.id === iteration.simpulEkspan && (
                        <span className="chosen-badge">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="iteration-result">
            → <strong>{iteration.simpulEkspanTitle}</strong> (f={iteration.fnEkspan.toFixed(3)} = g=
            {iteration.gnEkspan.toFixed(3)} + h={iteration.hnEkspan.toFixed(3)})
          </p>
        </div>
      )}
    </div>
  );
}
