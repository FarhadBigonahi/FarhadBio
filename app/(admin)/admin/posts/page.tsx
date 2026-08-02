"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { adminGet, adminRequest } from "@/lib/admin-fetch";
import { t, faNum } from "@/lib/admin-i18n";
import type { AnalyticsBundle, PostPerformance } from "@/lib/api-types";
import type { Post } from "@/lib/content";
import { postPath } from "@/lib/slugs";

type StatusFilter = "all" | "published" | "draft";
type SortKey = "newest" | "oldest" | "views" | "total" | "title";

const SORTS: SortKey[] = ["newest", "oldest", "views", "total", "title"];

/** A slug that no existing post is using, for the duplicate action. */
function freeSlug(base: string, taken: Set<string>): string {
  let slug = `${base}-copy`;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-copy-${n}`;
  return slug;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [perf, setPerf] = useState<Map<string, PostPerformance>>(new Map());
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const load = useCallback(() => {
    adminGet<{ posts: Post[] }>("/api/admin/posts")
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]));
    // Windowed traffic per post, keyed by slug. Unlike the old top-12 ranking
    // this covers every post, so a post outside the leaderboard reports its
    // real number instead of a zero.
    adminGet<AnalyticsBundle>("/api/admin/analytics?days=30")
      .then((d) =>
        setPerf(new Map((d.postPerformance || []).map((r) => [r.slug, r])))
      )
      .catch(() => setPerf(new Map()));
  }, []);
  useEffect(load, [load]);

  /** Shows a message and clears it, so a stale banner never lingers. */
  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const windowViews = (slug: string) => perf.get(slug)?.views ?? 0;

  const shown = useMemo(() => {
    if (!posts) return [];
    const q = query.trim().toLowerCase();
    const rows = posts.filter((p) => {
      if (status === "published" && p.status === "draft") return false;
      if (status === "draft" && p.status !== "draft") return false;
      if (!q) return true;
      return [p.title, p.slug, p.subtitle, ...p.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const by: Record<SortKey, (a: Post, b: Post) => number> = {
      newest: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      views: (a, b) => windowViews(b.slug) - windowViews(a.slug),
      total: (a, b) => (b.views ?? 0) - (a.views ?? 0),
      title: (a, b) => a.title.localeCompare(b.title, "fa"),
    };
    return [...rows].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, perf, query, status, sort]);

  // Bar widths are relative to the busiest post currently on screen, so the
  // column stays readable when a filter hides the site's one runaway hit.
  const maxViews = useMemo(
    () => Math.max(1, ...shown.map((p) => windowViews(p.slug))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, perf]
  );

  async function confirmDelete() {
    const p = pendingDelete;
    setPendingDelete(null);
    if (!p?.id) return;
    setBusy(p.id);
    try {
      await adminRequest(`/api/admin/posts/${p.id}`, { method: "DELETE" });
    } catch (err) {
      flash("err", err instanceof Error ? err.message : t.posts.deleteFailed);
    } finally {
      setBusy(null);
      load();
    }
  }

  /** Publish ↔ draft without opening the editor. */
  async function toggleStatus(p: Post) {
    if (!p.id) return;
    const next = p.status === "draft" ? "published" : "draft";
    setBusy(p.id);
    try {
      // The backend takes a whole post, so send this one back unchanged apart
      // from its status. Server-owned fields (id, views) are stripped there.
      await adminRequest(`/api/admin/posts/${p.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...p, status: next }),
      });
      flash(
        "ok",
        next === "published"
          ? t.posts.published(p.title)
          : t.posts.unpublished(p.title)
      );
    } catch (err) {
      flash("err", err instanceof Error ? err.message : t.posts.statusFailed);
    } finally {
      setBusy(null);
      load();
    }
  }

  /** Copy a post as a draft — the fastest way to start one from a template. */
  async function duplicate(p: Post) {
    if (!p.id) return;
    setBusy(p.id);
    const taken = new Set((posts ?? []).map((x) => x.slug));
    try {
      await adminRequest("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...p,
          title: `${p.title}${t.posts.copySuffix}`,
          slug: freeSlug(p.slug, taken),
          status: "draft",
        }),
      });
      flash("ok", t.posts.duplicated);
    } catch (err) {
      flash("err", err instanceof Error ? err.message : t.posts.duplicateFailed);
    } finally {
      setBusy(null);
      load();
    }
  }

  async function copyLink(p: Post) {
    try {
      // Encoded, not raw: a Persian slug pasted into Telegram or an email has
      // to survive as a URL, and half the clients that autolink it will not
      // encode it for you.
      await navigator.clipboard.writeText(
        `${window.location.origin}${postPath(p.slug)}`
      );
      flash("ok", t.common.copied);
    } catch {
      /* clipboard blocked — nothing useful to say about it */
    }
  }

  const filtering = Boolean(query.trim()) || status !== "all";

  return (
    <AdminShell
      title={t.posts.title}
      subtitle={
        posts ? t.posts.subtitle(shown.length, posts.length) : t.common.loading
      }
      actions={
        <Link className="ad-btn ad-btn--primary" href="/admin/posts/new">
          <PlusIcon /> {t.common.newPost}
        </Link>
      }
    >
      {notice && (
        <div className={`ad-banner ad-banner--${notice.kind === "ok" ? "ok" : "err"}`}>
          {notice.text}
        </div>
      )}

      <div className="ad-toolbar">
        <div className="ad-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.posts.search}
            aria-label={t.posts.search}
          />
        </div>

        <div className="ad-seg ad-seg--filter" role="group" aria-label={t.posts.colStatus}>
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              className={status === s ? "active" : ""}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
            >
              {s === "all"
                ? t.common.all
                : s === "published"
                  ? t.common.published
                  : t.common.draft}
            </button>
          ))}
        </div>

        <label className="ad-sort">
          <span className="ad-sort__label">{t.posts.sortLabel}</span>
          <select
            className="ad-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t.posts.sort[s]}
              </option>
            ))}
          </select>
        </label>

        {filtering && (
          <button
            type="button"
            className="ad-btn ad-btn--ghost"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            {t.posts.clearFilters}
          </button>
        )}
      </div>

      <div className="ad-card" style={{ padding: 8 }}>
        {!posts ? (
          <div className="ad-skel" style={{ height: 200, margin: 12 }} />
        ) : posts.length === 0 ? (
          <div className="ad-empty" style={{ padding: 48 }}>
            {t.posts.empty}{" "}
            <Link href="/admin/posts/new" style={{ color: "var(--accent-2)" }}>
              {t.posts.writeFirst}
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <div className="ad-empty" style={{ padding: 48 }}>
            {t.posts.noMatch}
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>{t.posts.colPost}</th>
                <th style={{ width: 104 }}>{t.posts.colStatus}</th>
                <th style={{ width: 170 }}>{t.posts.colViews}</th>
                <th style={{ width: 96 }}>{t.posts.colTotalViews}</th>
                <th style={{ width: 116 }}>{t.posts.colDate}</th>
                <th style={{ width: 168 }}>{t.posts.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const v = windowViews(p.slug);
                const draft = p.status === "draft";
                return (
                  <tr key={p.id} className={busy === p.id ? "is-busy" : undefined}>
                    <td>
                      <div className="ad-post-title">
                        <span>{p.emoji}</span>
                        <span dir={p.dir} className="ad-clip" style={{ maxWidth: 360 }}>
                          {p.title}
                        </span>
                      </div>
                      <div className="ad-post-slug ad-num" dir="ltr">/blog/{p.slug}</div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`ad-badge ad-badge--${draft ? "draft" : "pub"} ad-badge--btn`}
                        onClick={() => toggleStatus(p)}
                        disabled={busy === p.id}
                        title={draft ? t.posts.publishNow : t.posts.unpublish}
                      >
                        {draft ? t.common.draft : t.common.published}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="ad-num" style={{ fontWeight: 700, minWidth: 34 }}>
                          {faNum(v)}
                        </span>
                        <span className="ad-perf__bar">
                          <span className="ad-perf__fill" style={{ width: `${(v / maxViews) * 100}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="ad-num ad-muted" style={{ fontSize: 13 }}>
                      {faNum(p.views ?? 0)}
                    </td>
                    <td className="ad-num ad-muted" dir="ltr" style={{ fontSize: 13 }}>
                      {p.dateFa || p.date}
                    </td>
                    <td>
                      <div className="ad-row-actions">
                        {!draft && (
                          <a className="ad-icon-btn" href={postPath(p.slug)} target="_blank" title={t.common.viewLive}>
                            <ExtIcon />
                          </a>
                        )}
                        <button className="ad-icon-btn" onClick={() => copyLink(p)} title={t.common.copyLink}>
                          <LinkIcon />
                        </button>
                        <button
                          className="ad-icon-btn"
                          onClick={() => duplicate(p)}
                          disabled={busy === p.id}
                          title={t.common.duplicate}
                        >
                          <CopyIcon />
                        </button>
                        <Link className="ad-icon-btn" href={`/admin/posts/${p.id}`} title={t.common.edit}>
                          <EditIcon />
                        </Link>
                        <button
                          className="ad-icon-btn ad-icon-btn--danger"
                          onClick={() => setPendingDelete(p)}
                          disabled={busy === p.id}
                          title={t.common.delete}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.posts.confirmDeleteTitle}
        message={pendingDelete ? t.posts.confirmDelete(pendingDelete.title) : ""}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
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
function CopyIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}
function LinkIcon() {
  return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>;
}
