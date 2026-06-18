"use client";

import {
  BarChart3,
  ClipboardList,
  MapPinned,
  Navigation,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/community-map";

const adminNav = [
  { label: "Ringkasan", href: "/admin", icon: BarChart3 },
  { label: "Laporan Masuk", href: "/admin/reports", icon: ClipboardList },
  { label: "Verifikasi", href: "/admin/verification", icon: ShieldCheck },
  { label: "Peta Pantau", href: "/map", icon: MapPinned },
  { label: "Rute", href: "/routing", icon: Navigation },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

export function AdminShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: AppUser;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-[var(--asphalt)] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex size-11 items-center justify-center rounded-md border border-[var(--amber)] text-[var(--amber)]">
            DPU
          </span>
          <div>
            <p className="text-sm font-bold">{currentUser.fullName}</p>
            <p className="text-xs text-white/58">Petugas monitoring</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--teal)] text-white"
                    : "text-white/68 hover:bg-white/8 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton className="m-3" variant="sidebar" />
      </aside>
      <main className="lg:pl-56">{children}</main>
    </div>
  );
}
