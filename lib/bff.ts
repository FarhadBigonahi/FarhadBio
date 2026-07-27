// Backend-for-frontend helpers.
//
// Every /api/admin/* route in this app is a thin pass-through to the backend.
// Centralising it here means auth, timeouts, error shape and cookie cleanup are
// implemented once — a new admin endpoint is then a three-line file.
import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiAdmin } from "./api";
import { COOKIE } from "./auth";

function unauthorized(): NextResponse {
  const res = NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Not signed in." } },
    { status: 401 }
  );
  // Drop the dead cookie so the next navigation lands on /admin/login instead
  // of rendering a dashboard that can only ever show errors.
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

function badGateway(err: unknown): NextResponse {
  console.error("[bff] backend unreachable:", err);
  return NextResponse.json(
    {
      error: {
        code: "BACKEND_UNREACHABLE",
        message: "Could not reach the API server.",
      },
    },
    { status: 502 }
  );
}

async function token(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export type AdminCall<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; response: NextResponse };

/**
 * Calls the backend and parses JSON, so the caller can act on the result
 * (revalidate a path, reshape a payload) before responding.
 */
export async function callAdmin<T>(
  path: string,
  init: RequestInit = {}
): Promise<AdminCall<T>> {
  const t = await token();
  if (!t) return { ok: false, response: unauthorized() };

  let upstream: Response;
  try {
    upstream = await apiAdmin(path, t, init);
  } catch (err) {
    return { ok: false, response: badGateway(err) };
  }

  const data = (await upstream.json().catch(() => null)) as T | null;

  if (upstream.status === 401) return { ok: false, response: unauthorized() };
  if (!upstream.ok) {
    return {
      ok: false,
      response: NextResponse.json(data ?? { error: { code: "HTTP_ERROR", message: "Request failed." } }, {
        status: upstream.status,
      }),
    };
  }
  return { ok: true, status: upstream.status, data: data as T };
}

/**
 * Streams the backend's response straight through, headers intact.
 * Used for the CSV/JSON export, where re-encoding the body would be pointless
 * and would break the Content-Disposition filename.
 */
export async function streamAdmin(path: string): Promise<Response> {
  const t = await token();
  if (!t) return unauthorized();

  let upstream: Response;
  try {
    upstream = await apiAdmin(path, t);
  } catch (err) {
    return badGateway(err);
  }

  if (upstream.status === 401) return unauthorized();

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // An export is a snapshot of live data — never let a CDN hold on to it.
  headers.set("cache-control", "no-store");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
