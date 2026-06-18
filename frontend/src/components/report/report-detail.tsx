import Image from "next/image";
import Link from "next/link";
import { CalendarClock, MapPin, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MiniBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Map, MapControls, MapMarker } from "@/components/ui/map";
import { ReportEngagement } from "@/components/report/report-engagement";
import { getCategory, getStatusLabel } from "@/features/reports/catalog";
import { ReportChat } from "./report-chat";
import type { AppUser, Report } from "@/types/community-map";

export function ReportDetail({ report, currentUser, admin = false }: { report: Report; currentUser: AppUser | null; admin?: boolean }) {
  const category = getCategory(report.categorySlug);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MiniBadge tone="neutral">#{report.id}</MiniBadge>
            <StatusBadge status={report.status} />
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-black">{report.title}</h1>
          <p className="mt-2 text-[var(--muted)]">{report.address}</p>
        </div>
        <ButtonLink href={admin ? "/admin/reports" : "/map"} variant="secondary">
          Kembali
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/9] bg-[var(--surface-strong)]">
              <Image
                src={report.images[0]?.imageUrl || "/images/report-road.svg"}
                alt={report.images[0]?.alt || report.title}
                fill
                sizes="900px"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <CategoryIcon slug={report.categorySlug} />
                <div>
                  <p className="text-xs font-bold text-[var(--muted)]">Kategori</p>
                  <p className="font-bold">{category.name}</p>
                </div>
              </div>
              <p className="leading-7 text-[var(--asphalt)]">{report.description}</p>
              {report.status === "rejected" && report.rejectionReason && (
                <div className="mt-5 rounded-lg border border-[rgb(239_59_45_/_24%)] bg-[rgb(239_59_45_/_8%)] p-4 text-sm text-[var(--danger)]">
                  <p className="font-bold">Alasan penolakan</p>
                  <p className="mt-1 leading-6">{report.rejectionReason}</p>
                </div>
              )}
            </div>
          </Card>

          {report.resolutionImages.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-bold">Bukti Perbaikan</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {report.resolutionImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--surface-strong)]"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={image.alt}
                      fill
                      sizes="420px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-lg font-bold">Timeline Status</h2>
            <div className="mt-5 flex flex-col gap-4">
              {report.statusLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-[28px_1fr] gap-3">
                  <span className="mt-1 size-3 rounded-full bg-[var(--teal)] ring-4 ring-[rgb(0_107_98_/_12%)]" />
                  <div>
                    <p className="text-sm font-bold">{getStatusLabel(log.nextStatus)}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{log.note}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          <ReportEngagement report={report} />
          {currentUser && (currentUser.role === "admin" || currentUser.id === report.reporterId) && (
            <ReportChat report={report} currentUser={currentUser} />
          )}
          <Card className="p-5">
            <h2 className="text-lg font-bold">Ringkasan</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Info icon={MapPin} label="Wilayah" value={report.district} />
              <Info 
                icon={UserRound} 
                label="Pelapor" 
                value={
                  <Link href={`/users/${report.reporterUsername}`} className="hover:underline text-[var(--teal)]">
                    {report.reporterName}
                  </Link>
                } 
              />
              <Info
                icon={CalendarClock}
                label="Dilaporkan"
                value={new Date(report.createdAt).toLocaleDateString("id-ID")}
              />
              <Info icon={ThumbsUp} label="Upvote" value={`${report.upvoteCount} warga`} />
              <Info icon={ThumbsDown} label="Downvote" value={`${report.downvoteCount} warga`} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <Map
              initialViewState={{
                longitude: report.coordinates.longitude,
                latitude: report.coordinates.latitude,
                zoom: 14,
              }}
              className="h-72 border-b border-[var(--border)]"
            >
              <MapControls position="top-right" />
              <MapMarker
                longitude={report.coordinates.longitude}
                latitude={report.coordinates.latitude}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--danger)] text-white shadow-[0_16px_30px_rgb(239_59_45_/_28%)]">
                  <MapPin className="size-5" />
                </span>
              </MapMarker>
            </Map>
            <div className="p-4">
              <p className="text-sm font-bold">Koordinat</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {report.coordinates.latitude}, {report.coordinates.longitude}
              </p>
              <Link href={`/map?reportId=${report.id}`} className="mt-3 inline-block text-sm font-bold text-[var(--teal)]">
                Buka di peta publik
              </Link>
              <div className="mt-3">
                <Link
                  href={`/routing?reportIds=${report.id}&startLat=${report.coordinates.latitude}&startLng=${report.coordinates.longitude}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    admin
                      ? "bg-[var(--teal)] text-white hover:bg-[#00857a] shadow-[0_4px_14px_rgba(0,107,98,0.35)]"
                      : "border border-[var(--border)] text-[var(--teal)] hover:bg-[#f0fdf9]"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.22 4.22l2.12 2.12"/><path d="M17.66 17.66l2.12 2.12"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.22 19.78l2.12-2.12"/><path d="M17.66 6.34l2.12-2.12"/></svg>
                  {admin ? "Rencanakan Rute Peninjauan" : "Rute ke Laporan Ini"}
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-[var(--surface-strong)] p-3">
      <Icon className="mt-0.5 size-4 text-[var(--teal)]" />
      <div>
        <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
        <div className="mt-1 font-semibold">{value}</div>
      </div>
    </div>
  );
}
