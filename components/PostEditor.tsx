"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest } from "@/lib/admin-fetch";
import type { Post } from "@/lib/content";

type Block =
  | { type: "p"; html: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "callout"; html: string };

type Form = {
  status: string;
  lang: string;
  dir: "rtl" | "ltr";
  emoji: string;
  title: string;
  subtitle: string;
  excerpt: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  cover: string;
  coverFallback: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  date: string;
  dateFa: string;
  tagsText: string;
  repo: string;
  npm: string;
  body: Block[];
};

function fromPost(p?: Post): Form {
  return {
    status: p?.status || "published",
    lang: p?.lang || "fa",
    dir: p?.dir || "rtl",
    emoji: p?.emoji || "",
    title: p?.title || "",
    subtitle: p?.subtitle || "",
    excerpt: p?.excerpt || "",
    slug: p?.slug || "",
    metaTitle: p?.metaTitle || "",
    metaDescription: p?.metaDescription || "",
    cover: p?.cover || "",
    coverFallback: p?.coverFallback || "",
    coverAlt: p?.coverAlt || "",
    coverWidth: p?.coverWidth || 1200,
    coverHeight: p?.coverHeight || 800,
    date: p?.date || new Date().toISOString().slice(0, 10),
    dateFa: p?.dateFa || "",
    tagsText: (p?.tags || []).join(", "),
    repo: p?.repo || "",
    npm: p?.npm || "",
    body: (p?.body as Block[]) || [],
  };
}

const BLOCK_LABEL: Record<Block["type"], string> = {
  p: "Paragraph",
  h3: "Heading",
  code: "Code",
  callout: "Callout",
};

export default function PostEditor({ initial, id }: { initial?: Post; id?: number }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => fromPost(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const tags = useMemo(
    () => f.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    [f.tagsText]
  );

  // ---- SEO scoring ----
  const metaTitle = f.metaTitle || f.title;
  const metaDesc = f.metaDescription || f.excerpt;
  const checks = [
    { ok: f.title.trim().length > 0, label: "Has a title" },
    { ok: metaTitle.length > 0 && metaTitle.length <= 60, label: "Meta title ≤ 60 chars" },
    { ok: metaDesc.length >= 50 && metaDesc.length <= 160, label: "Meta description 50–160 chars" },
    { ok: f.slug.trim().length > 0 || f.title.trim().length > 0, label: "Has a URL slug" },
    { ok: f.coverFallback.trim().length > 0 || f.cover.trim().length > 0, label: "Cover image set" },
    { ok: f.coverAlt.trim().length > 0, label: "Cover alt text (accessibility)" },
    { ok: tags.length >= 1, label: "At least one tag/keyword" },
    { ok: f.excerpt.trim().length > 0, label: "Has an excerpt" },
    { ok: f.body.length >= 1, label: "Has body content" },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  // ---- block ops ----
  function addBlock(type: Block["type"]) {
    const blank: Block =
      type === "h3"
        ? { type: "h3", text: "" }
        : type === "code"
        ? { type: "code", lang: "bash", code: "" }
        : { type, html: "" };
    set("body", [...f.body, blank]);
  }
  function updateBlock(i: number, patch: Partial<Block>) {
    set(
      "body",
      f.body.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b))
    );
  }
  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= f.body.length) return;
    const next = [...f.body];
    [next[i], next[j]] = [next[j], next[i]];
    set("body", next);
  }
  function removeBlock(i: number) {
    set("body", f.body.filter((_, j) => j !== i));
  }

  async function save(publishOverride?: string) {
    setSaving(true);
    setError("");
    const payload = {
      ...f,
      status: publishOverride || f.status,
      tags,
    };
    try {
      await adminRequest(id ? `/api/admin/posts/${id}` : "/api/admin/posts", {
        method: id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      // adminRequest surfaces the backend's own message — e.g. "Slug X already
      // exists." — which is far more actionable than a generic failure.
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  }

  const previewSlug = f.slug || slugPreview(f.metaTitle || f.title);

  return (
    <>
      {error && <div className="ad-banner ad-banner--err">{error}</div>}

      <div className="ad-editor">
        {/* ---------- main column ---------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ad-card">
            <div className="ad-row">
              <div className="ad-field" style={{ maxWidth: 90 }}>
                <label>Emoji</label>
                <input className="ad-input" value={f.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🐎" />
              </div>
              <div className="ad-field" style={{ gridColumn: "span 1" }}>
                <label>Status</label>
                <select className="ad-select" value={f.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="ad-field">
              <label>Title *</label>
              <input className="ad-input" dir={f.dir} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="عنوان مقاله" />
            </div>
            <div className="ad-field">
              <label>Subtitle</label>
              <input className="ad-input" dir={f.dir} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div className="ad-field">
              <label>Excerpt <span className="hint">— short summary shown on the blog list</span></label>
              <textarea className="ad-textarea" dir={f.dir} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>
          </div>

          {/* body blocks */}
          <div className="ad-card">
            <div className="ad-card__head">
              <h3>Content</h3>
              <span style={{ color: "var(--faint)", fontSize: 12 }}>{f.body.length} block(s)</span>
            </div>
            <div className="ad-blocks">
              {f.body.map((b, i) => (
                <div className="ad-block" key={i}>
                  <div className="ad-block__bar">
                    <span className="ad-block__type">{BLOCK_LABEL[b.type]}</span>
                    {b.type === "code" && (
                      <input
                        className="ad-input"
                        style={{ width: 110, padding: "5px 8px", fontSize: 12 }}
                        value={b.lang}
                        onChange={(e) => updateBlock(i, { lang: e.target.value })}
                        placeholder="lang"
                      />
                    )}
                    <span className="ad-block__spacer" />
                    <button className="ad-block__mini" onClick={() => moveBlock(i, -1)} title="Move up">↑</button>
                    <button className="ad-block__mini" onClick={() => moveBlock(i, 1)} title="Move down">↓</button>
                    <button className="ad-block__mini" onClick={() => removeBlock(i)} title="Delete">✕</button>
                  </div>
                  {b.type === "h3" ? (
                    <input className="ad-input" dir={f.dir} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder="Heading text" />
                  ) : b.type === "code" ? (
                    <textarea className="ad-textarea" style={{ fontFamily: "ui-monospace, monospace", direction: "ltr" }} value={b.code} onChange={(e) => updateBlock(i, { code: e.target.value })} placeholder="code…" />
                  ) : (
                    <textarea className="ad-textarea" dir={f.dir} value={b.html} onChange={(e) => updateBlock(i, { html: e.target.value })} placeholder="Text — basic HTML like <strong> allowed" />
                  )}
                </div>
              ))}
              {f.body.length === 0 && <div className="ad-empty">Add your first content block below.</div>}
            </div>
            <div className="ad-addblock">
              <button className="ad-chip" onClick={() => addBlock("p")}>+ Paragraph</button>
              <button className="ad-chip" onClick={() => addBlock("h3")}>+ Heading</button>
              <button className="ad-chip" onClick={() => addBlock("code")}>+ Code</button>
              <button className="ad-chip" onClick={() => addBlock("callout")}>+ Callout</button>
            </div>
          </div>

          {/* meta / media */}
          <div className="ad-card">
            <div className="ad-card__head"><h3>SEO &amp; metadata</h3></div>
            <div className="ad-field">
              <label>
                Meta title
                <Counter len={(f.metaTitle || f.title).length} good={[10, 60]} />
              </label>
              <input className="ad-input" dir={f.dir} value={f.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={f.title || "Defaults to the title"} />
            </div>
            <div className="ad-field">
              <label>
                Meta description
                <Counter len={(f.metaDescription || f.excerpt).length} good={[50, 160]} />
              </label>
              <textarea className="ad-textarea" dir={f.dir} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder={f.excerpt || "Defaults to the excerpt"} />
            </div>
            <div className="ad-field">
              <label>URL slug <span className="hint">— farhad.bio/blog/<b>{previewSlug || "…"}</b></span></label>
              <input className="ad-input" style={{ direction: "ltr" }} value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from title" />
            </div>
            <div className="ad-field">
              <label>Tags / keywords <span className="hint">— comma separated</span></label>
              <input className="ad-input" dir={f.dir} value={f.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="Open Source, هوش مصنوعی, Node.js" />
              {tags.length > 0 && (
                <div className="ad-tagrow" style={{ marginTop: 10 }}>
                  {tags.map((t) => (
                    <span className="ad-tag" key={t}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ad-card">
            <div className="ad-card__head"><h3>Cover image</h3></div>
            <div className="ad-field">
              <label>Image URL <span className="hint">— /images/blog/…webp or a full URL</span></label>
              <input className="ad-input" style={{ direction: "ltr" }} value={f.coverFallback} onChange={(e) => { set("coverFallback", e.target.value); if (!f.cover) set("cover", e.target.value); }} placeholder="/images/blog/cover.png" />
            </div>
            <div className="ad-field">
              <label>Cover alt text <span className="hint">— describe the image for SEO &amp; screen readers</span></label>
              <input className="ad-input" dir={f.dir} value={f.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
            </div>
            {f.coverFallback && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={f.coverFallback}
                alt="cover preview"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth) {
                    set("coverWidth", img.naturalWidth);
                    set("coverHeight", img.naturalHeight);
                  }
                }}
                style={{ maxWidth: "100%", borderRadius: 10, marginTop: 4, border: "1px solid var(--line)" }}
              />
            )}
            <div className="hint" style={{ marginTop: 8 }}>
              Detected size: {f.coverWidth}×{f.coverHeight}
            </div>
          </div>

          <div className="ad-card">
            <div className="ad-card__head"><h3>Details</h3></div>
            <div className="ad-row">
              <div className="ad-field">
                <label>Date</label>
                <input className="ad-input" type="date" style={{ direction: "ltr" }} value={f.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div className="ad-field">
                <label>Date (Persian label)</label>
                <input className="ad-input" dir="rtl" value={f.dateFa} onChange={(e) => set("dateFa", e.target.value)} placeholder="۳۰ تیر ۱۴۰۵" />
              </div>
            </div>
            <div className="ad-row">
              <div className="ad-field">
                <label>Language</label>
                <select className="ad-select" value={f.lang} onChange={(e) => { const lang = e.target.value; set("lang", lang); set("dir", lang === "fa" || lang === "ar" ? "rtl" : "ltr"); }}>
                  <option value="fa">Persian (fa)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
              <div className="ad-field">
                <label>Direction</label>
                <select className="ad-select" value={f.dir} onChange={(e) => set("dir", e.target.value as "rtl" | "ltr")}>
                  <option value="rtl">RTL</option>
                  <option value="ltr">LTR</option>
                </select>
              </div>
            </div>
            <div className="ad-row">
              <div className="ad-field">
                <label>GitHub repo URL</label>
                <input className="ad-input" style={{ direction: "ltr" }} value={f.repo} onChange={(e) => set("repo", e.target.value)} placeholder="https://github.com/…" />
              </div>
              <div className="ad-field">
                <label>npm package</label>
                <input className="ad-input" style={{ direction: "ltr" }} value={f.npm} onChange={(e) => set("npm", e.target.value)} placeholder="package-name" />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- sticky side column ---------- */}
        <div className="ad-side-col">
          <div className="ad-card">
            <div className="ad-card__head"><h3>SEO score</h3></div>
            <div className="ad-score">
              <div className="ad-score__ring" style={{ ["--p" as string]: score }}>
                <i>{score}</i>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {passed}/{checks.length} checks passed
              </div>
            </div>
            <ul className="ad-checks">
              {checks.map((c, i) => (
                <li key={i} className={c.ok ? "pass" : "fail"}>
                  <span className="mk">{c.ok ? "✓" : "•"}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="ad-card">
            <div className="ad-card__head"><h3>Google preview</h3></div>
            <div className="ad-serp" dir={f.dir}>
              <div className="ad-serp__url">
                farhad.bio <span>› blog › {previewSlug || "…"}</span>
              </div>
              <div className="ad-serp__title">
                {(f.metaTitle || f.title || "Post title").slice(0, 60)}
              </div>
              <div className="ad-serp__desc">
                {(f.metaDescription || f.excerpt || "Your meta description will appear here.").slice(0, 165)}
              </div>
            </div>
          </div>

          <div className="ad-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="ad-btn ad-btn--primary" disabled={saving} onClick={() => save("published")} style={{ justifyContent: "center" }}>
              {saving ? "Saving…" : id ? "Update & publish" : "Publish post"}
            </button>
            <button className="ad-btn ad-btn--ghost" disabled={saving} onClick={() => save("draft")} style={{ justifyContent: "center" }}>
              Save as draft
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Counter({ len, good }: { len: number; good: [number, number] }) {
  const cls = len === 0 ? "warn" : len < good[0] || len > good[1] ? "bad" : "ok";
  return <span className={`ad-counter ad-counter--${cls}`}>{len}</span>;
}

function slugPreview(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
