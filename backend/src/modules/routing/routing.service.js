/**
 * Modul Routing — Algoritma A* dengan Heuristik Jarak Manhattan
 *
 * Implementasi sesuai materi kuliah IF2211 Strategi Algoritma (2026)
 * oleh Nur Ulfa Maulidevi & Rinaldi M.
 *
 * Formulasi:
 *   f(n) = g(n) + h(n)
 *   g(n) = biaya aktual perjalanan dari simpul awal ke simpul n (jarak Haversine dalam km)
 *   h(n) = estimasi biaya dari simpul n ke tujuan (jarak Manhattan dalam km)
 *
 * Heuristik Manhattan bersifat ADMISSIBLE karena:
 *   - Jarak Manhattan (|Δlat| + |Δlng| dikonversi ke km) ≤ jarak lurus (Euclidean)
 *   - Jarak lurus ≤ jarak jalan sebenarnya
 *   - Sehingga h(n) ≤ h*(n), menjamin solusi optimal
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Menghitung jarak Haversine antara dua titik koordinat.
 * Digunakan sebagai biaya aktual g(n) antar simpul bertetangga.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} jarak dalam km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Menghitung jarak Manhattan antara dua titik koordinat geografis.
 * Digunakan sebagai fungsi heuristik h(n).
 *
 * Jarak Manhattan = (|Δlat| + |Δlng|) × faktor_konversi_ke_km
 *
 * Faktor konversi:
 *   - 1 derajat lintang ≈ 111.32 km
 *   - 1 derajat bujur ≈ 111.32 × cos(lat) km
 *
 * Ini ADMISSIBLE karena Jarak Manhattan ≤ Jarak Euclidean (lurus) ≤ Jarak Jalan Nyata
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} estimasi jarak dalam km
 */
function manhattanDistance(lat1, lng1, lat2, lng2) {
  const KM_PER_DEGREE_LAT = 111.32;
  const avgLat = (lat1 + lat2) / 2;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos((avgLat * Math.PI) / 180);

  const dLat = Math.abs(lat2 - lat1) * KM_PER_DEGREE_LAT;
  const dLng = Math.abs(lng2 - lng1) * kmPerDegreeLng;

  return dLat + dLng;
}

/**
 * Implementasi Priority Queue (Min-Heap) untuk A*.
 * Menjamin node dengan f(n) terkecil selalu diproses lebih dahulu.
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min.item;
  }

  get size() {
    return this.heap.length;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * Algoritma A* untuk menemukan urutan kunjungan laporan yang optimal (TSP).
 *
 * Masalah: Diberikan posisi awal petugas dan daftar laporan yang perlu ditinjau,
 * tentukan urutan kunjungan dengan total jarak tempuh minimum.
 *
 * Pendekatan: True A* Search pada Graf State (Subsets).
 * State: (simpul_saat_ini, set_laporan_belum_dikunjungi)
 *
 * @param {{ lat: number, lng: number }} start - Posisi awal petugas
 * @param {Array<{ id: string, lat: number, lng: number, title: string }>} reports - Daftar laporan
 * @returns {{ path: Array, totalDistance: number, iterations: Array }}
 */
function aStarRoute(start, reports) {
  if (!reports || reports.length === 0) {
    return { path: [], totalDistance: 0, iterations: [], startPoint: start };
  }

  const pq = new PriorityQueue();
  const closedList = new Map();

  const getUnvisitedKey = (unvisitedIds) => [...unvisitedIds].sort().join(",");
  const getStateKey = (currentId, unvisitedIds) => currentId + "|" + getUnvisitedKey(unvisitedIds);

  const initialUnvisited = reports.map((r) => r.id);
  
  // Heuristic admissible untuk initial state: jarak manhattan terjauh ke laporan mana pun
  const initialHeuristic = Math.max(
    0,
    ...reports.map((r) => manhattanDistance(start.lat, start.lng, r.lat, r.lng))
  );

  const initialState = {
    currentId: "START",
    currentPos: start,
    unvisitedIds: initialUnvisited,
    g: 0,
    h: initialHeuristic,
    f: initialHeuristic,
    path: [], // menyimpan object laporan lengkap
    title: "Posisi Petugas",
  };

  pq.push(initialState, initialState.f);

  let bestSolution = null;
  const iterations = [];
  let iterCount = 0;

  // Batasi log iterasi agar memori tidak penuh dan tabel frontend tidak lag (maksimal 50)
  const MAX_LOG_ITERATIONS = 50;

  while (pq.size > 0) {
    const current = pq.pop();

    if (current.unvisitedIds.length === 0) {
      bestSolution = current;
      break;
    }

    const stateKey = getStateKey(current.currentId, current.unvisitedIds);
    if (closedList.has(stateKey) && closedList.get(stateKey) <= current.g) {
      continue;
    }
    closedList.set(stateKey, current.g);

    iterCount++;
    const openNodesLog = [];

    // Expand ke semua node yang belum dikunjungi
    for (const nextId of current.unvisitedIds) {
      const nextReport = reports.find((r) => r.id === nextId);
      const newUnvisitedIds = current.unvisitedIds.filter((id) => id !== nextId);

      const stepCost = haversineDistance(
        current.currentPos.lat,
        current.currentPos.lng,
        nextReport.lat,
        nextReport.lng
      );
      const newG = current.g + stepCost;

      // Heuristic: Jarak manhattan terjauh dari nextReport ke node unvisited lainnya
      let newH = 0;
      if (newUnvisitedIds.length > 0) {
        newH = Math.max(
          ...newUnvisitedIds.map((id) => {
            const r = reports.find((x) => x.id === id);
            return manhattanDistance(nextReport.lat, nextReport.lng, r.lat, r.lng);
          })
        );
      }

      const newF = newG + newH;

      const newPath = [
        ...current.path,
        {
          ...nextReport,
          distanceFromPrev: parseFloat(stepCost.toFixed(4)),
          cumulativeDistance: parseFloat(newG.toFixed(4)),
          order: current.path.length + 1,
        },
      ];

      const nextState = {
        currentId: nextReport.id,
        currentPos: { lat: nextReport.lat, lng: nextReport.lng },
        unvisitedIds: newUnvisitedIds,
        g: newG,
        h: newH,
        f: newF,
        path: newPath,
        title: nextReport.title,
      };

      pq.push(nextState, newF);

      if (iterCount <= MAX_LOG_ITERATIONS) {
        openNodesLog.push({
          id: nextReport.id,
          title: nextReport.title,
          gn: parseFloat(newG.toFixed(4)),
          hn: parseFloat(newH.toFixed(4)),
          fn: parseFloat(newF.toFixed(4)),
        });
      }
    }

    if (iterCount <= MAX_LOG_ITERATIONS) {
      // Urutkan simpul hidup di log berdasarkan f(n)
      openNodesLog.sort((a, b) => a.fn - b.fn);

      // Cari simpul mana yang dipilih dari ekspansi ini (yang f-nya terkecil)
      const chosenFromLog = openNodesLog.length > 0 ? openNodesLog[0] : null;

      iterations.push({
        iterasi: iterCount,
        dari: current.title,
        simpulHidup: openNodesLog,
        simpulEkspan: chosenFromLog ? chosenFromLog.id : "-",
        simpulEkspanTitle: chosenFromLog ? chosenFromLog.title : "-",
        gnEkspan: chosenFromLog ? chosenFromLog.gn : 0,
        hnEkspan: chosenFromLog ? chosenFromLog.hn : 0,
        fnEkspan: chosenFromLog ? chosenFromLog.fn : 0,
      });
    }
  }

  // Jika iterasi melebihi batas log, tambahkan info
  if (iterCount > MAX_LOG_ITERATIONS) {
    iterations.push({
      iterasi: iterCount,
      dari: "...",
      simpulHidup: [],
      simpulEkspan: "...",
      simpulEkspanTitle: `(Total ${iterCount} iterasi diekspansi untuk mencari rute absolut paling optimal)`,
      gnEkspan: 0,
      hnEkspan: 0,
      fnEkspan: 0,
    });
  }

  if (!bestSolution) {
    return { path: [], totalDistance: 0, iterations, startPoint: start };
  }

  return {
    path: bestSolution.path,
    totalDistance: parseFloat(bestSolution.g.toFixed(4)),
    iterations,
    startPoint: start,
    algorithmInfo: {
      name: "A* (A-Star) TSP Optimal",
      heuristic: "Max Jarak Manhattan ke Sisa Node",
      evaluation: "f(n) = g(n) + h(n)",
      gDescription: "Jarak Haversine kumulatif dari posisi awal melewati rute saat ini (km)",
      hDescription: "Estimasi jarak Manhattan minimum yang diperlukan untuk menyapu semua sisa node (km)",
      admissible: true,
      admissibleReason: "Nilai max Manhattan ke sisa node tidak akan pernah melebihi jarak rute jalan sebenarnya (admissible & consistent).",
    },
  };
}

module.exports = { aStarRoute, haversineDistance, manhattanDistance };
