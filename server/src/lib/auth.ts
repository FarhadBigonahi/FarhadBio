// Stateless admin sessions: `base64url(payload).base64url(HMAC-SHA256(payload))`.
//
// Stateless on purpose — no session table, no Redis, nothing to migrate when the
// service moves hosts. The cost is that you cannot revoke one session; you
// revoke ALL of them by rotating AUTH_SECRET. For a single-admin blog that is
// the right trade.
//
// The token is minted here and stored by the Next.js BFF in a first-party
// httpOnly cookie. This service never sees or sets a cookie — it only ever
// reads `Authorization: Bearer <token>`, which is what keeps it usable from
// any frontend, on any domain, on any host.
import crypto from "node:crypto";
import { config } from "../config";

const DAY_MS = 86_400_000;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(data: string): Buffer {
  return crypto.createHmac("sha256", config.authSecret).update(data).digest();
}

/** Length-safe constant-time compare (timingSafeEqual throws on length mismatch). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so failures cost the same as successes.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export type SessionClaims = { exp: number; iat: number };

export function createSession(days = config.sessionDays): {
  token: string;
  expiresAt: number;
} {
  const now = Date.now();
  const claims: SessionClaims = { iat: now, exp: now + days * DAY_MS };
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  return {
    token: `${payload}.${b64url(hmac(payload))}`,
    expiresAt: claims.exp,
  };
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;

  const payload = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), b64url(hmac(payload)))) return false;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionClaims;
    return typeof claims.exp === "number" && claims.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Compare a submitted password to ADMIN_PASSWORD.
 * Both sides are HMAC'd first so the comparison length never leaks the real
 * password's length, and so timingSafeEqual always gets equal-length inputs.
 */
export function checkPassword(submitted: string): boolean {
  if (!submitted) return false;
  return crypto.timingSafeEqual(hmac(submitted), hmac(config.adminPassword));
}

/** Pulls the raw token out of an Authorization header. */
export function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token || null;
}
