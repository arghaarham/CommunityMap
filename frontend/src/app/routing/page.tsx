import type { Metadata } from "next";
import "./routing.css";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { safeGetCurrentUser } from "@/lib/api/server";
import { RoutePlanner } from "./route-planner";

export const metadata: Metadata = {
  title: "Perencana Rute A* | CommunityMap Admin",
  description:
    "Hitung rute optimal peninjauan laporan kerusakan jalan menggunakan algoritma A* dengan heuristik Jarak Manhattan.",
};

async function fetchRoutingReports() {
  try {
    const INTERNAL_API =
      process.env.INTERNAL_API_URL ?? "http://127.0.0.1:4000";
    const res = await fetch(`${INTERNAL_API}/api/routing/reports`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function RoutingPage({
  searchParams,
}: {
  searchParams: Promise<{ reportIds?: string; startLat?: string; startLng?: string }>;
}) {
  const currentUser = await safeGetCurrentUser();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/login");
  }

  const reports = await fetchRoutingReports();
  const params = await searchParams;
  const preSelectedIds = params.reportIds
    ? params.reportIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  const preStartLat = params.startLat ? parseFloat(params.startLat) : undefined;
  const preStartLng = params.startLng ? parseFloat(params.startLng) : undefined;

  return (
    <AdminShell currentUser={currentUser}>
      <div className="routing-admin-page">
        {/* Page Header — matches admin style */}
        <div className="routing-admin-header">
          <div>
            <h1 className="routing-admin-title">Perencana Rute Peninjauan</h1>
            <p className="routing-admin-sub">
              Tentukan urutan kunjungan laporan optimal menggunakan A* dengan heuristik{" "}
              <strong>Jarak Manhattan</strong>
            </p>
          </div>
        </div>

        <div className="routing-planner-wrap">
          <RoutePlanner
            initialReports={reports}
            preSelectedIds={preSelectedIds}
            preStartLat={preStartLat}
            preStartLng={preStartLng}
          />
        </div>
      </div>
    </AdminShell>
  );
}
