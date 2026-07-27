// preHandler guard for every /v1/admin route.
//
// One guard, applied by the route group rather than per-route, so a new admin
// endpoint cannot be added un-authenticated by forgetting a line.
import type { FastifyReply, FastifyRequest } from "fastify";
import { bearer, verifySession } from "../lib/auth";
import { unauthorized } from "../lib/http-error";

export async function requireAdmin(
  req: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = bearer(req.headers.authorization);
  if (!verifySession(token)) {
    // Logged at warn (not error) — a failed login is expected traffic, and
    // burying real errors under it is how you stop reading your own logs.
    req.log.warn({ path: req.url, ip: req.ip }, "admin auth rejected");
    throw unauthorized("Invalid or expired session.");
  }
}
