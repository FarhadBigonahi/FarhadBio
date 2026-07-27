import { NextResponse } from "next/server";
import { apiBase } from "@/lib/api";
import { COOKIE, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The password is verified by the backend, never here. On success we take the
// bearer token it returns and park it in a first-party httpOnly cookie, so the
// browser never handles the credential or the token directly.
export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    // Distinguish "backend unreachable" from "wrong password" — otherwise an
    // outage looks like a forgotten password and you debug the wrong thing.
    console.error("[login] backend unreachable:", err);
    return NextResponse.json(
      { error: "Backend unreachable. Check the API server." },
      { status: 502 }
    );
  }

  const data = (await upstream.json().catch(() => null)) as
    | { token?: string; expiresAt?: number; error?: { message?: string } }
    | null;

  if (!upstream.ok || !data?.token) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Login failed." },
      { status: upstream.status || 500 }
    );
  }

  // Cookie lifetime mirrors the token's own expiry so they never disagree.
  const maxAge = data.expiresAt
    ? Math.max(60, Math.floor((data.expiresAt - Date.now()) / 1000))
    : 7 * 24 * 60 * 60;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, data.token, sessionCookieOptions(maxAge));
  return res;
}
