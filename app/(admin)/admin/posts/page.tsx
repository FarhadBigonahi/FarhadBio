"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { adminGet, adminRequest } from "@/lib/admin-fetch";
import type { Post } from "@/lib/content";

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    adminGet<{ posts: Post[] }>("/api/admin/posts")
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]));
  }
  useEffect(load, []);

  async function del(p: Post) {
    if (!p.id) return;
    if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    setBusy(p.id);
    try {
      await adminRequest(`/api/admin/posts/${p.id}`, { method: "DELETE" });
    } catch (err) {
      // Surface the backend's reason instead of silently leaving the row there.
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(null);
      load();
    }
  }

  return (
    <AdminShell
      title="Posts"
      subtitle={posts ? `${posts.length} total` : "Loading…"}
      actions={
        <Link className="ad-btn ad-btn--primary" href="/admin/posts/new">
          <PlusIcon /> New post
        </Link>
      }
    >
      <div className="ad-card" style={{ padding: 8 }}>
        {!posts ? (
          <div className="ad-skel" style={{ height: 200, margin: 12 }} />
        ) : posts.length === 0 ? (
          <div className="ad-empty" style={{ padding: 48 }}>
            No posts yet.{" "}
            <Link href="/admin/posts/new" style={{ color: "var(--accent-2)" }}>
              Write your first post →
            </Link>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Post</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 130 }}>Date</th>
                <th style={{ width: 110, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="ad-post-title">
                      <span>{p.emoji}</span>
                      <span dir={p.dir} style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </span>
                    </div>
                    <div className="ad-post-slug">/blog/{p.slug}</div>
                  </td>
                  <td>
                    <span className={`ad-badge ad-badge--${p.status === "draft" ? "draft" : "pub"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{p.date}</td>
                  <td>
                    <div className="ad-row-actions">
                      {p.status !== "draft" && (
                        <a className="ad-icon-btn" href={`/blog/${p.slug}`} target="_blank" title="View live">
                          <ExtIcon />
                        </a>
                      )}
                      <Link className="ad-icon-btn" href={`/admin/posts/${p.id}`} title="Edit">
                        <EditIcon />
                      </Link>
                      <button
                        className="ad-icon-btn ad-icon-btn--danger"
                        onClick={() => del(p)}
                        disabled={busy === p.id}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}

const s = { width: 16, height: 16 };
function PlusIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" /></svg>;
}
function ExtIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>;
}
