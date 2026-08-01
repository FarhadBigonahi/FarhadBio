// Wires the HTTP layer together. No business logic lives here — this file is
// only "which plugins, which routes, how do errors render".
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { config } from "./config";
import { HttpError } from "./lib/http-error";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { postsRoutes } from "./modules/posts/posts.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { uploadsRoutes } from "./modules/uploads/uploads.routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // nginx (and Cloudflare in front of it) rewrite the client IP; without this
    // every rate-limit bucket would key on 127.0.0.1 and lock out the world.
    trustProxy: config.trustProxy,
    logger: {
      level: config.logLevel,
      // Structured JSON in prod (pm2 captures it); readable lines in dev.
      transport: config.isProd
        ? undefined
        : { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    bodyLimit: 1_048_576, // 1 MB — a blog post with inline HTML, nothing more.
    disableRequestLogging: false,
  });

  await app.register(cors, {
    origin(origin, callback) {
      // No Origin header = a server-to-server call (the Next.js BFF) or curl.
      // CORS does not apply to those; the bearer token is what guards them.
      if (!origin) return callback(null, true);
      callback(null, config.corsOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization"],
    maxAge: 86_400,
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    // Rate limiting is a courtesy, not a security control here; if the counter
    // store ever misbehaves we would rather serve traffic than 500.
    continueExceeding: true,
    errorResponseBuilder: () => ({
      error: { code: "RATE_LIMITED", message: "Too many requests." },
    }),
  });

  // navigator.sendBeacon cannot send a preflighted request, and any
  // Content-Type other than text/plain triggers a CORS preflight. So the
  // analytics beacon arrives as text/plain containing JSON — parse it as JSON,
  // and never let a malformed body throw (a bad beacon is not an error).
  app.addContentTypeParser(
    "text/plain",
    { parseAs: "string" },
    (_req, body: string, done) => {
      try {
        done(null, body ? JSON.parse(body) : {});
      } catch {
        done(null, {});
      }
    }
  );

  // A few headers nginx does not set for us. Full helmet would be dead weight
  // on a JSON-only API that never renders HTML.
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-frame-options", "DENY");
    return payload;
  });

  // MUST come before the route registrations. `await app.register()` boots a
  // plugin immediately, and each plugin's encapsulated context snapshots the
  // parent's handlers at creation time — set these later and every route
  // silently keeps Fastify's default error shape instead of our contract.
  app.setNotFoundHandler((req, reply) =>
    reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: `No route ${req.method} ${req.url}` } })
  );

  app.setErrorHandler((raw, req, reply) => {
    // Fastify types the handler's error as `unknown`; everything below needs a
    // concrete shape, so narrow once here instead of casting at each use.
    const err = raw as FastifyError;

    if (err instanceof HttpError) {
      return reply
        .code(err.status)
        .send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return reply.code(400).send({
        error: {
          code: "VALIDATION_FAILED",
          message: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input.",
        },
      });
    }
    // Fastify's own 4xx (bad JSON body, unsupported media type…) stay 4xx.
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, "unhandled error");
    else req.log.warn({ err: err.message }, "client error");

    return reply.code(status).send({
      error: {
        code: err.code ?? "INTERNAL_ERROR",
        // Never leak an internal stack/message to the public.
        message: status >= 500 ? "Something went wrong." : err.message,
      },
    });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(postsRoutes);
  await app.register(analyticsRoutes);
  await app.register(uploadsRoutes);

  return app;
}
