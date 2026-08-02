import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../../config";
import { requireAdmin } from "../../plugins/require-admin";
import * as repo from "./analytics.repo";
import * as postsRepo from "../posts/posts.repo";
import {
  deviceFromUA,
  normalizePath,
  postSlugFromPath,
  shouldRecord,
  sourceFromReferrer,
} from "./analytics.service";

/** Windows longer than a year are rejected rather than silently clamped-down. */
const daysQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const eventBody = z.object({
  path: z.string().max(512).default("/"),
  referrer: z.string().max(512).default(""),
  session: z.string().max(64).default(""),
});

/** Hostnames that count as "us" when classifying a referrer. */
const selfHosts = config.corsOrigins.flatMap((o) => {
  try {
    return [new URL(o).hostname];
  } catch {
    return [];
  }
});

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  // ---------------------------------------------------------------- ingest
  // Called straight from the visitor's browser via navigator.sendBeacon, so it
  // must be public, cheap, and incapable of breaking a page view.
  app.post(
    "/v1/events",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = eventBody.safeParse(req.body ?? {});
      // A malformed beacon is the client's problem, never ours: 204 and move on.
      if (!parsed.success) return reply.code(204).send();

      const { referrer, session } = parsed.data;
      // Stored decoded, so `events.path` and `posts.slug` are the same string.
      const path = normalizePath(parsed.data.path);
      const ua = req.headers["user-agent"] ?? "";
      if (!shouldRecord(path, ua)) return reply.code(204).send();

      try {
        await repo.recordEvent({
          path,
          referrer,
          session,
          source: sourceFromReferrer(referrer, selfHosts),
          // Cloudflare adds this on every proxied request — free geo, no GeoIP db.
          country: String(req.headers["cf-ipcountry"] ?? "").slice(0, 2),
          device: deviceFromUA(ua),
        });

        // Same beacon, second effect: bump the article's lifetime counter. It
        // is a separate number from the event row because events get pruned and
        // are keyed by URL, while this one travels with the post row and so
        // survives both retention and a slug rename.
        const slug = postSlugFromPath(path);
        if (slug) await postsRepo.incrementViews(slug);
      } catch (err) {
        // Analytics must never surface as an error to a reader's browser.
        req.log.error({ err }, "failed to record event");
      }
      return reply.code(204).send();
    }
  );

  // ----------------------------------------------------------------- admin
  app.register(async (admin) => {
    admin.addHook("preHandler", requireAdmin);

    admin.get("/v1/admin/analytics", async (req) => {
      const { days } = daysQuery.parse(req.query);
      return repo.getBundle(days);
    });

    admin.get("/v1/admin/analytics/export", async (req, reply) => {
      const { days } = daysQuery.parse(req.query);
      const format =
        (req.query as { format?: string }).format === "json" ? "json" : "csv";
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "json") {
        const bundle = await repo.getBundle(days);
        return reply
          .header("content-type", "application/json; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="farhadbio-analytics-${days}d-${stamp}.json"`
          )
          .send(JSON.stringify(bundle, null, 2));
      }

      const csv = await repo.rawEventsCsv(days);
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header(
          "content-disposition",
          `attachment; filename="farhadbio-events-${days}d-${stamp}.csv"`
        )
        // Leading BOM so Excel reads the Persian paths as UTF-8.
        .send("﻿" + csv);
    });
  });
}
