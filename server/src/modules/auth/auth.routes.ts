// Login lives on the backend because the backend owns the data it protects.
// It returns a bearer token; storing it (in a first-party httpOnly cookie) is
// the frontend's job. That split is what lets the admin UI move to any host.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createSession, checkPassword, bearer, verifySession } from "../../lib/auth";
import { badRequest, unauthorized } from "../../lib/http-error";

const loginSchema = z.object({ password: z.string().min(1) });

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/auth/login",
    {
      // Brute-force gate. Deliberately much tighter than the global limit:
      // this is the only endpoint where guessing gets you anything.
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (req) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw badRequest("Password is required.");

      if (!checkPassword(parsed.data.password)) {
        req.log.warn({ ip: req.ip }, "failed admin login");
        throw unauthorized("Wrong password.");
      }

      const { token, expiresAt } = createSession();
      req.log.info({ ip: req.ip }, "admin login ok");
      return { token, expiresAt };
    }
  );

  /** Cheap token check — lets the frontend validate a cookie without a write. */
  app.get("/v1/auth/session", async (req) => ({
    ok: verifySession(bearer(req.headers.authorization)),
  }));
}
