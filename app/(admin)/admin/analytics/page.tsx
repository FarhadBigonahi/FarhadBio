"use client";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { AreaChart, BarList, StatCard, Trend, fmt } from "@/components/AdminCharts";
import { adminGet } from "@/lib/admin-fetch";
import { t, faNum, faPercent } from "@/lib/admin-i18n";
import type { AnalyticsBundle } from "@/lib/api-types";

const RANGES = [7, 30, 90, 365];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminGet<AnalyticsBundle>(`/api/admin/analytics?days=${days}`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  const o = data?.overview;

  // Per-post performance now arrives ready-made from the backend, complete for
  // every post rather than only the top twelve paths.
  const perPost = useMemo(() => {
    const rows = (data?.postPerformance || []).filter((r) => r.status !== "draft");
    const total = rows.reduce((sum, r) => sum + r.views, 0) || 1;
    const max = Math.max(1, ...rows.map((r) => r.views));
    return { rows, total, max };
  }, [data]);

  return (
    <AdminShell
      title={t.analytics.title}
      subtitle={t.analytics.subtitle}
      actions={
        <>
          <div className="ad-range">
            {RANGES.map((d) => (
              <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>
                {t.analytics.ranges[d]}
              </button>
            ))}
          </div>
          <a className="ad-btn" href={`/api/admin/analytics/export?days=${days}&format=csv`}>
            <DownIcon /> CSV
          </a>
          <a className="ad-btn" href={`/api/admin/analytics/export?days=${days}&format=json`}>
            <DownIcon /> JSON
          </a>
        </>
      }
    >
      <div className="ad-grid ad-stats" style={{ marginBottom: 16, opacity: loading ? 0.6 : 1 }}>
        <StatCard label={t.overview.views} value={o ? fmt(o.views) : "—"} trend={o?.viewsTrend} />
        <StatCard label={t.analytics.uniqueVisitors} value={o ? fmt(o.visitors) : "—"} trend={o?.visitorsTrend} />
        <StatCard label={t.overview.perVisitor} value={o ? faNum(o.avgPerVisitor) : "—"} />
        <StatCard label={t.analytics.allTimeViews} value={o ? fmt(o.totalPostViews) : "—"} />
      </div>

      <div className="ad-card" style={{ marginBottom: 16 }}>
        <div className="ad-card__head">
          <h3>{t.analytics.overTime}</h3>
          <span style={{ color: "var(--faint)", fontSize: 12 }}>{t.analytics.lastDays(days)}</span>
        </div>
        {data ? <AreaChart data={data.timeseries} /> : <div className="ad-skel" style={{ height: 240 }} />}
      </div>

      {/* Per-post performance — the "views of each post" view. */}
      <div className="ad-card" style={{ marginBottom: 16 }}>
        <div className="ad-card__head">
          <div>
            <h3>{t.analytics.perPost}</h3>
            <span style={{ color: "var(--faint)", fontSize: 12 }}>{t.analytics.perPostSub}</span>
          </div>
        </div>
        {perPost.rows.length === 0 ? (
          <div className="ad-empty">{t.overview.noPosts}</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>{t.posts.colPost}</th>
                <th style={{ width: 92 }}>{t.overview.views}</th>
                <th style={{ width: 96 }}>{t.analytics.colVisitors}</th>
                <th style={{ width: 88 }}>{t.analytics.colTrend}</th>
                <th style={{ width: 92 }}>{t.analytics.colTotal}</th>
                <th style={{ width: 190 }}>{t.analytics.colShare}</th>
              </tr>
            </thead>
            <tbody>
              {perPost.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="ad-post-title">
                      <span>{r.emoji}</span>
                      <span dir={r.dir} className="ad-clip" style={{ maxWidth: 340 }}>
                        {r.title}
                      </span>
                    </div>
                    <div className="ad-post-slug ad-num" dir="ltr">/blog/{r.slug}</div>
                  </td>
                  <td className="ad-num" style={{ fontWeight: 700 }}>
                    {r.views > 0 ? faNum(r.views) : <span className="ad-muted" style={{ fontWeight: 400, fontSize: 12.5 }}>{t.analytics.zeroViews}</span>}
                  </td>
                  <td className="ad-num ad-muted" style={{ fontSize: 13 }}>{faNum(r.visitors)}</td>
                  <td>
                    {/* A trend against a window with no traffic is arithmetic,
                        not information — show it only once there is a baseline. */}
                    {r.views > 0 ? <Trend value={r.trend} /> : <span className="ad-muted">—</span>}
                  </td>
                  <td className="ad-num ad-muted" style={{ fontSize: 13 }}>{faNum(r.totalViews)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="ad-perf__bar" style={{ flex: 1 }}>
                        <span className="ad-perf__fill" style={{ width: `${(r.views / perPost.max) * 100}%` }} />
                      </span>
                      <span className="ad-num ad-muted" style={{ fontSize: 12.5, minWidth: 42, textAlign: "start" }}>
                        {faPercent((r.views / perPost.total) * 100)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="ad-grid ad-cols" style={{ marginBottom: 16 }}>
        <div className="ad-card">
          <div className="ad-card__head"><h3>{t.analytics.topPages}</h3></div>
          <BarList items={data?.topPosts || []} empty={t.overview.noViews} />
        </div>
        <div className="ad-card">
          <div className="ad-card__head"><h3>{t.analytics.sources}</h3></div>
          <BarList items={data?.sources || []} empty={t.overview.noTraffic} />
        </div>
      </div>

      <div className="ad-grid ad-cols">
        <div className="ad-card">
          <div className="ad-card__head"><h3>{t.analytics.countries}</h3></div>
          <BarList items={data?.countries || []} empty={t.analytics.noGeo} />
        </div>
        <div className="ad-card">
          <div className="ad-card__head"><h3>{t.analytics.devices}</h3></div>
          <BarList items={data?.devices || []} empty={t.common.noData} />
        </div>
      </div>
    </AdminShell>
  );
}

function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
