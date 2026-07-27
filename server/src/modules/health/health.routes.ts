// Health endpoints. Split in two because they answer different questions:
//   /health/live  — is the process up? (used by pm2/nginx/uptime checks)
//   /health/ready — can it actually serve? (used by the deploy script's gate)
// A deploy that flips traffic on "live" alone will happily promote a release
// that cannot reach its own database.
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health/live", async () => ({
    ok: true,
    uptime: Math.round(process.uptime()),
  }));

  app.get("/health/ready", async (_req, reply) => {
    try {
      await db().execute("SELECT 1");
      return { ok: true, db: "up" };
    } catch (err) {
      reply.code(503);
      return { ok: false, db: "down", error: String(err) };
    }
  });
}
