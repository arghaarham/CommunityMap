/**
 * Debug endpoint — HAPUS setelah masalah auth selesai diinvestigasi.
 * Akses: GET https://communitymap.site/debug-auth
 * Menampilkan: cookies yang diterima Lambda, dan hasil panggilan ke backend /auth/me.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.INTERNAL_API_URL
    ? `${process.env.INTERNAL_API_URL}/api`
    : "http://127.0.0.1:4000/api";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let backendResult: unknown = null;
  let backendError: string | null = null;

  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });
    backendResult = await res.json();
  } catch (err) {
    backendError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    internalApiUrl: BACKEND_URL,
    nodeEnv: process.env.NODE_ENV,
    cookiesReceived: allCookies.map((c) => ({
      name: c.name,
      // Sembunyikan nilai token agar tidak bocor, tapi tunjukkan apakah ada
      hasValue: !!c.value,
      preview: c.value?.slice(0, 20) + "...",
    })),
    backendResult,
    backendError,
  });
}
