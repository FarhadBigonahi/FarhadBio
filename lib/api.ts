// The single place this app talks to the backend.
//
// Nothing else in the codebase knows the backend's URL, its auth scheme, or its
// error shape. Moving the backend to a different host is one environment
// variable; swapping it for a different implementation is this file.
import "server-only";
import type { ApiErrorBody } from "./api-types";

/**
 * Server-side calls prefer API_INTERNAL_URL when set — useful if you ever want
 * Vercel to bypass Cloudflare and hit the origin directly. Browser code can
 * only ever use the public one.
 */
export function apiBase(): string {
  const url =
    process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "";
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set — the frontend has no backend to talk to."
    );
  }
  return url.replace(/\/+$/, "");
}

/** Non-2xx from the backend, with its machine-readable code preserved. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The link between Vercel and the origin can be slow; it must never be able to
// hang a page render indefinitely.
const TIMEOUT_MS = 10_000;

type GetOptions = {
  /** Seconds Next.js may serve this response from its cache. */
  revalidate?: number;
  /** Cache tags, so a write can purge exactly what it changed. */
  tags?: string[];
};

/** Cached GET for public content. Throws on transport or non-2xx failure. */
export async function apiGet<T>(
  path: string,
  { revalidate = 300, tags = [] }: GetOptions = {}
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate, tags },
  });

  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

/**
 * Proxies an admin request through to the backend, attaching the session token
 * from the first-party cookie as a bearer.
 *
 * Never cached: admin data is always live, and a cached admin response is a
 * data-leak waiting to happen.
 */
export async function apiAdmin(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = "HTTP_ERROR";
  let message = `Backend responded ${res.status}`;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // Non-JSON error body (nginx 502 page, gateway timeout) — keep the default.
  }
  return new ApiError(res.status, code, message);
}
