"use client";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { AreaChart, BarList, StatCard, fmt } from "@/components/AdminCharts";
import { adminGet } from "@/lib/admin-fetch";
import type { AnalyticsBundle } from "@/lib/api-types";

const RANGES = [
  { d: 7, label: "7d" },
  { d: 30, label: "30d" },
  { d: 90, label: "90d" },
  { d: 365, label: "1y" },
];

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

  return (
    <AdminShell
      title="Analytics"
      subtitle="First-party, cookie-free traffic — measured by your own site"
      actions={
        <>
          <div className="ad-range">
            {RANGES.map((r) => (
              <button key={r.d} className={days === r.d ? "active" : ""} onClick={() => setDays(r.d)}>
                {r.label}
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
        <StatCard label="Page views" value={o ? fmt(o.views) : "—"} trend={o?.viewsTrend} />
        <StatCard label="Unique visitors" value={o ? fmt(o.visitors) : "—"} trend={o?.visitorsTrend} />
        <StatCard label="Views / visitor" value={o ? String(o.avgPerVisitor) : "—"} />
        <StatCard label="Published posts" value={o ? String(o.posts) : "—"} />
      </div>

      <div className="ad-card" style={{ marginBottom: 16 }}>
        <div className="ad-card__head">
          <h3>Views over time</h3>
          <span style={{ color: "var(--faint)", fontSize: 12 }}>last {days} days</span>
        </div>
        {data ? <AreaChart data={data.timeseries} /> : <div className="ad-skel" style={{ height: 240 }} />}
      </div>

      <div className="ad-grid ad-cols" style={{ marginBottom: 16 }}>
        <div className="ad-card">
          <div className="ad-card__head"><h3>Top pages &amp; posts</h3></div>
          <BarList items={data?.topPosts || []} />
        </div>
        <div className="ad-card">
          <div className="ad-card__head"><h3>Traffic sources</h3></div>
          <BarList items={data?.sources || []} />
        </div>
      </div>

      <div className="ad-grid ad-cols">
        <div className="ad-card">
          <div className="ad-card__head"><h3>Countries</h3></div>
          <BarList items={data?.countries || []} empty="No geo data yet (populates on Vercel)" />
        </div>
        <div className="ad-card">
          <div className="ad-card__head"><h3>Devices</h3></div>
          <BarList items={data?.devices || []} />
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
