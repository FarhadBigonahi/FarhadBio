// Every analytics query. Aggregation happens in SQLite, not in Node — pulling
// a year of raw rows into memory to count them would be the one thing that
// makes this box sweat.
import type { InArgs } from "@libsql/client";
import { db } from "../../db/client";
import { countPublished } from "../posts/posts.repo";
import { csvCell } from "../../lib/text";

const DAY_MS = 86_400_000;

export type EventInput = {
  path: string;
  referrer: string;
  source: string;
  country: string;
  device: string;
  session: string;
};

export async function recordEvent(e: EventInput): Promise<void> {
  await db().execute({
    sql: `INSERT INTO events (ts,path,referrer,source,country,device,session)
          VALUES (?,?,?,?,?,?,?)`,
    args: [
      Date.now(),
      e.path.slice(0, 512),
      e.referrer.slice(0, 512),
      e.source.slice(0, 64),
      e.country.slice(0, 8),
      e.device.slice(0, 16),
      e.session.slice(0, 64),
    ],
  });
}

/** Deletes events older than `days`. Returns how many rows went away. */
export async function pruneEvents(days: number): Promise<number> {
  const res = await db().execute({
    sql: "DELETE FROM events WHERE ts < ?",
    args: [Date.now() - days * DAY_MS],
  });
  return Number(res.rowsAffected ?? 0);
}

async function scalar(sql: string, args: InArgs = []): Promise<number> {
  const res = await db().execute({ sql, args });
  const row = res.rows[0];
  return row ? Number(Object.values(row)[0] ?? 0) : 0;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export type Overview = {
  views: number;
  visitors: number;
  viewsTrend: number;
  visitorsTrend: number;
  posts: number;
  avgPerVisitor: number;
};

export async function getOverview(days: number): Promise<Overview> {
  const since = Date.now() - days * DAY_MS;
  const prevSince = since - days * DAY_MS;

  // Trends compare the window to the equally-sized window before it.
  const [views, visitors, prevViews, prevVisitors, posts] = await Promise.all([
    scalar("SELECT COUNT(*) n FROM events WHERE ts>=?", [since]),
    scalar("SELECT COUNT(DISTINCT session) n FROM events WHERE ts>=?", [since]),
    scalar("SELECT COUNT(*) n FROM events WHERE ts>=? AND ts<?", [
      prevSince,
      since,
    ]),
    scalar("SELECT COUNT(DISTINCT session) n FROM events WHERE ts>=? AND ts<?", [
      prevSince,
      since,
    ]),
    countPublished(),
  ]);

  return {
    views,
    visitors,
    viewsTrend: pctChange(views, prevViews),
    visitorsTrend: pctChange(visitors, prevVisitors),
    posts,
    avgPerVisitor: visitors ? Math.round((views / visitors) * 10) / 10 : 0,
  };
}

export type DayPoint = { day: string; views: number; visitors: number };

/** One row per day for the last `days`, zero-filled, oldest first. */
export async function getTimeseries(days: number): Promise<DayPoint[]> {
  const since = Date.now() - days * DAY_MS;
  const res = await db().execute({
    sql: `SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') d,
                 COUNT(*) views, COUNT(DISTINCT session) visitors
          FROM events WHERE ts>=? GROUP BY d`,
    args: [since],
  });

  const found = new Map(
    res.rows.map((r) => [
      String(r.d),
      { views: Number(r.views), visitors: Number(r.visitors) },
    ])
  );

  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    const hit = found.get(day) ?? { views: 0, visitors: 0 };
    out.push({ day, views: hit.views, visitors: hit.visitors });
  }
  return out;
}

export type Ranked = { label: string; value: number; extra?: string };

async function ranked(sql: string, since: number): Promise<Ranked[]> {
  const res = await db().execute({ sql, args: [since] });
  return res.rows.map((r) => ({
    label: String(r.label ?? ""),
    value: Number(r.value ?? 0),
    extra: r.extra != null ? String(r.extra) : undefined,
  }));
}

export function getTopPosts(days: number): Promise<Ranked[]> {
  // LEFT JOIN so non-post pages (/, /blog) still appear, just without a title.
  return ranked(
    `SELECT e.path label, COUNT(*) value, p.title extra
       FROM events e
       LEFT JOIN posts p
         ON ('/blog/'||p.slug)=e.path OR ('/blog/'||p.slug||'/')=e.path
      WHERE e.ts>=? GROUP BY e.path ORDER BY value DESC LIMIT 12`,
    Date.now() - days * DAY_MS
  );
}

export function getTopSources(days: number): Promise<Ranked[]> {
  return ranked(
    `SELECT source label, COUNT(*) value FROM events
      WHERE ts>=? GROUP BY source ORDER BY value DESC LIMIT 10`,
    Date.now() - days * DAY_MS
  );
}

export function getCountries(days: number): Promise<Ranked[]> {
  return ranked(
    `SELECT CASE WHEN country='' THEN 'Unknown' ELSE country END label,
            COUNT(*) value FROM events
      WHERE ts>=? GROUP BY label ORDER BY value DESC LIMIT 12`,
    Date.now() - days * DAY_MS
  );
}

export function getDevices(days: number): Promise<Ranked[]> {
  return ranked(
    `SELECT device label, COUNT(*) value FROM events
      WHERE ts>=? GROUP BY device ORDER BY value DESC`,
    Date.now() - days * DAY_MS
  );
}

export type AnalyticsBundle = {
  days: number;
  overview: Overview;
  timeseries: DayPoint[];
  topPosts: Ranked[];
  sources: Ranked[];
  countries: Ranked[];
  devices: Ranked[];
};

/** Everything the dashboard needs, in one round trip. */
export async function getBundle(days: number): Promise<AnalyticsBundle> {
  const [overview, timeseries, topPosts, sources, countries, devices] =
    await Promise.all([
      getOverview(days),
      getTimeseries(days),
      getTopPosts(days),
      getTopSources(days),
      getCountries(days),
      getDevices(days),
    ]);
  return { days, overview, timeseries, topPosts, sources, countries, devices };
}

/** Flat CSV of raw events — the dashboard's download button. */
export async function rawEventsCsv(days: number): Promise<string> {
  const res = await db().execute({
    sql: `SELECT ts,path,source,referrer,country,device,session
            FROM events WHERE ts>=? ORDER BY ts DESC`,
    args: [Date.now() - days * DAY_MS],
  });

  const header = "datetime,path,source,referrer,country,device,session";
  const rows = res.rows.map((r) =>
    [
      new Date(Number(r.ts)).toISOString(),
      r.path,
      r.source,
      r.referrer,
      r.country,
      r.device,
      r.session,
    ]
      .map(csvCell)
      .join(",")
  );
  return [header, ...rows].join("\n");
}
