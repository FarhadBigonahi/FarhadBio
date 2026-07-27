"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { AreaChart, BarList, StatCard, fmt } from "@/components/AdminCharts";
import { adminGet } from "@/lib/admin-fetch";
import type { AnalyticsBundle } from "@/lib/api-types";
import type { Post } from "@/lib/content";

export default function Overview() {
  const [data, setData] = useState<AnalyticsBundle | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    adminGet<AnalyticsBundle>("/api/admin/analytics?days=30")
      .then(setData)
      .catch(() => setData(null));
    adminGet<{ posts: Post[] }>("/api/admin/posts")
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]));
  }, []);

  const o = data?.overview;

  return (
    <AdminShell
      title="Overview"
      subtitle="Traffic and content at a glance — last 30 days"
      actions={
        <>
          <Link className="ad-btn" href="/admin/analytics">
            Full analytics
          </Link>
          <Link className="ad-btn ad-btn--primary" href="/admin/posts/new">
            <PlusIcon /> New post
          </Link>
        </>
      }
    >
      <div className="ad-grid ad-stats" style={{ marginBottom: 16 }}>
        {o ? (
          <>
            <StatCard label="Page views" value={fmt(o.views)} trend={o.viewsTrend} icon={<EyeIcon />} />
            <StatCard label="Visitors" value={fmt(o.visitors)} trend={o.visitorsTrend} icon={<UserIcon />} />
            <StatCard label="Views / visitor" value={String(o.avgPerVisitor)} icon={<RepeatIcon />} />
            <StatCard label="Published posts" value={String(o.posts)} icon={<DocIcon />} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="ad-card" key={i}>
              <div className="ad-skel" style={{ height: 14, width: "50%" }} />
              <div className="ad-skel" style={{ height: 30, width: "40%", marginTop: 14 }} />
            </div>
          ))
        )}
      </div>

      <div className="ad-grid ad-2col" style={{ marginBottom: 16 }}>
        <div className="ad-card">
          <div className="ad-card__head">
            <h3>Traffic</h3>
            <span style={{ color: "var(--faint)", fontSize: 12 }}>views / day</span>
          </div>
          {data ? (
            <AreaChart data={data.timeseries} />
          ) : (
            <div className="ad-skel" style={{ height: 240 }} />
          )}
        </div>
        <div className="ad-card">
          <div className="ad-card__head">
            <h3>Top sources</h3>
          </div>
          <BarList items={data?.sources || []} empty="No traffic yet" />
        </div>
      </div>

      <div className="ad-grid ad-2col">
        <div className="ad-card">
          <div className="ad-card__head">
            <h3>Recent posts</h3>
            <Link href="/admin/posts" style={{ color: "var(--accent-2)", fontSize: 13, fontWeight: 700 }}>
              Manage all
            </Link>
          </div>
          {posts ? (
            posts.length ? (
              <table className="ad-table">
                <tbody>
                  {posts.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="ad-post-title">
                          <span>{p.emoji}</span>
                          <span dir={p.dir} style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.title}
                          </span>
                        </div>
                        <div className="ad-post-slug">/blog/{p.slug}</div>
                      </td>
                      <td style={{ width: 90 }}>
                        <span className={`ad-badge ad-badge--${p.status === "draft" ? "draft" : "pub"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ width: 70, textAlign: "right" }}>
                        <Link className="ad-icon-btn" href={`/admin/posts/${p.id}`} style={{ marginLeft: "auto" }}>
                          <EditIcon />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="ad-empty">No posts yet — create your first one.</div>
            )
          ) : (
            <div className="ad-skel" style={{ height: 160 }} />
          )}
        </div>
        <div className="ad-card">
          <div className="ad-card__head">
            <h3>Top posts</h3>
          </div>
          <BarList items={data?.topPosts || []} empty="No views yet" />
        </div>
      </div>
    </AdminShell>
  );
}

/* inline icons */
const s = { width: 16, height: 16 };
function PlusIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}
function EyeIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function RepeatIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m17 2 4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
}
