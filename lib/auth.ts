// Frontend-side session handling.
//
// This app does NOT verify sessions — the backend mints and validates the token
// and is the only thing holding AUTH_SECRET. All this layer does is keep the
// token in a first-party httpOnly cookie and attach it to admin calls.
//
// Why a cookie here instead of the browser calling the backend directly:
//   - the token never touches JavaScript, so an XSS cannot steal it;
//   - no cross-site cookie (SameSite=None) is needed, so it survives every
//     browser's third-party cookie policy;
//   - the backend stays a pure bearer-token API, usable from anything.
import type { NextRequest } from "next/server";

export const COOKIE = "fb_admin";

/** Cookie attributes for the session. Kept in one place so they cannot drift. */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Presence check for the Edge middleware.
 *
 * Deliberately NOT a signature check: verifying would mean shipping the signing
 * secret to the frontend, defeating the point of the backend owning auth. Real
 * enforcement happens on every admin API call — this only decides whether to
 * render the dashboard shell or bounce to the login page.
 */
export function hasSessionCookie(req: NextRequest): boolean {
  const value = req.cookies.get(COOKIE)?.value;
  return Boolean(value && value.includes("."));
}
