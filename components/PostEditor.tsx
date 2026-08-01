"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest } from "@/lib/admin-fetch";
import { t, faDigits } from "@/lib/admin-i18n";
import type { Block } from "@/lib/api-types";
import type { Post } from "@/lib/content";

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
  p: t.editor.addP,
  h3: t.editor.addH,
  code: t.editor.addCode,
  callout: t.editor.addCallout,
  quote: t.editor.addQuote,
  list: t.editor.addList,
  image: t.editor.addImage,
};

const ADD_BUTTONS: Block["type"][] = [
  "p",
  "h3",
  "list",
  "quote",
  "code",
  "callout",
  "image",
];

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// Matches the backend's normalizePost, so the estimate shown here is the number
// that actually gets stored — not a second, slightly different guess.
const WORDS_PER_MINUTE = 200;

function blank(type: Block["type"]): Block {
  switch (type) {
    case "h3":
      return { type: "h3", text: "" };
    case "code":
      return { type: "code", lang: "bash", code: "" };
    case "quote":
      return { type: "quote", html: "", cite: "" };
    case "list":
      return { type: "list", ordered: false, items: [""] };
    case "image":
      return { type: "image", src: "", alt: "", caption: "", width: 1200, height: 800 };
    default:
      return { type, html: "" };
  }
}

export default function PostEditor({ initial, id }: { initial?: Post; id?: number }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => fromPost(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingAt, setUploadingAt] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => {
    setDirty(true);
    setF((s) => ({ ...s, [k]: v }));
  }, []);

  const tags = useMemo(
    () => f.tagsText.split(",").map((s) => s.trim()).filter(Boolean),
    [f.tagsText]
  );

  // ---- length / reading time ----
  const stats = useMemo(() => {
    let text = f.title;
    for (const b of f.body) {
      if (b.type === "p" || b.type === "callout" || b.type === "quote") {
        text += " " + b.html.replace(/<[^>]*>/g, " ");
      } else if (b.type === "h3") text += " " + b.text;
      else if (b.type === "code") text += " " + b.code;
      else if (b.type === "list") text += " " + b.items.join(" ");
      else if (b.type === "image") text += " " + b.caption;
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return { words, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) };
  }, [f.title, f.body]);

  // ---- SEO scoring ----
  const metaTitle = f.metaTitle || f.title;
  const metaDesc = f.metaDescription || f.excerpt;
  const images = f.body.filter((b): b is Extract<Block, { type: "image" }> => b.type === "image");
  const checks = [
    { ok: f.title.trim().length > 0, label: t.editor.checks.title },
    { ok: metaTitle.length > 0 && metaTitle.length <= 60, label: t.editor.checks.metaTitle },
    { ok: metaDesc.length >= 50 && metaDesc.length <= 160, label: t.editor.checks.metaDesc },
    { ok: f.slug.trim().length > 0 || f.title.trim().length > 0, label: t.editor.checks.slug },
    { ok: f.coverFallback.trim().length > 0 || f.cover.trim().length > 0, label: t.editor.checks.cover },
    { ok: f.coverAlt.trim().length > 0, label: t.editor.checks.coverAlt },
    { ok: tags.length >= 1, label: t.editor.checks.tags },
    { ok: f.excerpt.trim().length > 0, label: t.editor.checks.excerpt },
    { ok: f.body.length >= 1, label: t.editor.checks.body },
    // Vacuously true with no inline images, which is correct: a post without
    // images has no missing alt text.
    { ok: images.every((b) => b.alt.trim().length > 0), label: t.editor.checks.blockAlt },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  // ---- image upload (compress in-browser → base64 → backend) ----
  const upload = useCallback(async (file: File) => {
    const { dataUrl, width, height, ext } = await compressImage(file);
    const res = await adminRequest<{ url: string }>("/api/admin/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: dataUrl, ext }),
    });
    const url = /^https?:\/\//.test(res.url) ? res.url : `${API_BASE}${res.url}`;
    return { url, width, height };
  }, []);

  async function onCoverFile(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setError("");
    try {
      const { url, width, height } = await upload(file);
      setDirty(true);
      setF((s) => ({ ...s, cover: url, coverFallback: url, coverWidth: width, coverHeight: height }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.editor.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  async function onBlockFile(i: number, file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingAt(i);
    setError("");
    try {
      const { url, width, height } = await upload(file);
      updateBlock(i, { src: url, width, height });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.editor.uploadFailed);
    } finally {
      setUploadingAt(null);
    }
  }

  // ---- block ops ----
  function addBlock(type: Block["type"]) {
    set("body", [...f.body, blank(type)]);
  }
  function updateBlock(i: number, patch: Partial<Block>) {
    set("body", f.body.map((b, j) => (j === i ? ({ ...b, ...patch } as Block) : b)));
  }
  function duplicateBlock(i: number) {
    const next = [...f.body];
    next.splice(i + 1, 0, structuredClone(f.body[i]));
    set("body", next);
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

  const save = useCallback(
    async (publishOverride?: string) => {
      setSaving(true);
      setError("");
      const payload = { ...f, status: publishOverride || f.status, tags };
      try {
        await adminRequest(id ? `/api/admin/posts/${id}` : "/api/admin/posts", {
          method: id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Cleared before navigating, or the unload guard fires on our own
        // successful save and asks the author to confirm leaving.
        setDirty(false);
        router.push("/admin/posts");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t.editor.saveFailed);
        setSaving(false);
      }
    },
    [f, tags, id, router]
  );

  // Ctrl/Cmd+S saves, the way every other editor behaves. Without this the
  // browser's own "save page" dialog answers the reflex instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!saving && !uploading) void save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, saving, uploading]);

  // Closing the tab mid-post used to lose the whole draft silently.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const previewSlug = f.slug || slugPreview(f.metaTitle || f.title);
  const hasCover = !!f.coverFallback;

  return (
    <>
      {error && <div className="ad-banner ad-banner--err">{error}</div>}

      <div className="ad-editor">
        {/* ---------- main column ---------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* essentials */}
          <div className="ad-card">
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
              <div className="ad-field" style={{ margin: 0 }}>
                <label>{t.editor.status}</label>
                <div className="ad-seg">
                  <button type="button" data-tone="pub" className={f.status !== "draft" ? "active" : ""} onClick={() => set("status", "published")}>
                    {t.common.published}
                  </button>
                  <button type="button" data-tone="draft" className={f.status === "draft" ? "active" : ""} onClick={() => set("status", "draft")}>
                    {t.common.draft}
                  </button>
                </div>
              </div>
              <div className="ad-field" style={{ margin: 0, width: 84 }}>
                <label>{t.editor.emoji}</label>
                <input className="ad-input" style={{ textAlign: "center", fontSize: 18 }} value={f.emoji} onChange={(e) => set("emoji", e.target.value)} placeholder="🐎" />
              </div>
            </div>

            <div className="ad-field">
              <label>{t.editor.postTitle} *</label>
              <input className="ad-input ad-input--title" dir={f.dir} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={t.editor.postTitlePh} />
            </div>
            <div className="ad-field">
              <label>{t.editor.subtitle}</label>
              <input className="ad-input" dir={f.dir} value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
            <div className="ad-field" style={{ marginBottom: 0 }}>
              <label>{t.editor.excerpt} <span className="hint">— {t.editor.excerptHint}</span></label>
              <textarea className="ad-textarea" dir={f.dir} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>
          </div>

          {/* content blocks */}
          <div className="ad-card">
            <div className="ad-card__head">
              <h3>{t.editor.content}</h3>
              <span style={{ color: "var(--faint)", fontSize: 12 }}>
                {t.editor.blocks(f.body.length)} · {t.editor.stats(stats.words, stats.minutes)}
              </span>
            </div>
            <div className="ad-blocks">
              {f.body.map((b, i) => (
                <div className="ad-block" key={i}>
                  <div className="ad-block__bar">
                    <span className="ad-block__type">{BLOCK_LABEL[b.type]}</span>
                    {b.type === "code" && (
                      <input
                        className="ad-input"
                        dir="ltr"
                        style={{ width: 110, padding: "5px 8px", fontSize: 12 }}
                        value={b.lang}
                        onChange={(e) => updateBlock(i, { lang: e.target.value })}
                        placeholder="lang"
                      />
                    )}
                    {b.type === "list" && (
                      <div className="ad-seg ad-seg--mini">
                        <button type="button" className={!b.ordered ? "active" : ""} onClick={() => updateBlock(i, { ordered: false })}>
                          {t.editor.listBullet}
                        </button>
                        <button type="button" className={b.ordered ? "active" : ""} onClick={() => updateBlock(i, { ordered: true })}>
                          {t.editor.listOrdered}
                        </button>
                      </div>
                    )}
                    <span className="ad-block__spacer" />
                    <button type="button" className="ad-block__mini" onClick={() => moveBlock(i, -1)} title={t.editor.moveUp}>↑</button>
                    <button type="button" className="ad-block__mini" onClick={() => moveBlock(i, 1)} title={t.editor.moveDown}>↓</button>
                    <button type="button" className="ad-block__mini" onClick={() => duplicateBlock(i)} title={t.editor.duplicateBlock}>⧉</button>
                    <button type="button" className="ad-block__mini" onClick={() => removeBlock(i)} title={t.common.delete}>✕</button>
                  </div>

                  {b.type === "h3" ? (
                    <input className="ad-input" dir={f.dir} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder={t.editor.headingPh} />
                  ) : b.type === "code" ? (
                    <textarea className="ad-textarea" style={{ fontFamily: "ui-monospace, monospace", direction: "ltr" }} value={b.code} onChange={(e) => updateBlock(i, { code: e.target.value })} placeholder={t.editor.codePh} />
                  ) : b.type === "quote" ? (
                    <>
                      <textarea className="ad-textarea" dir={f.dir} value={b.html} onChange={(e) => updateBlock(i, { html: e.target.value })} placeholder={t.editor.quotePh} />
                      <input className="ad-input" dir={f.dir} style={{ marginTop: 8 }} value={b.cite} onChange={(e) => updateBlock(i, { cite: e.target.value })} placeholder={t.editor.quoteCitePh} />
                    </>
                  ) : b.type === "list" ? (
                    <textarea
                      className="ad-textarea"
                      dir={f.dir}
                      // One line per item. Empty lines are kept while typing and
                      // dropped by the backend on save, so pressing Enter twice
                      // never costs the author an item.
                      value={b.items.join("\n")}
                      onChange={(e) => updateBlock(i, { items: e.target.value.split("\n") })}
                      placeholder={t.editor.listPh}
                    />
                  ) : b.type === "image" ? (
                    <div className="ad-block__image">
                      {b.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.src}
                          alt={b.alt || "image"}
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalWidth !== b.width) {
                              updateBlock(i, { width: img.naturalWidth, height: img.naturalHeight });
                            }
                          }}
                        />
                      ) : (
                        <label className="ad-block__pick">
                          {uploadingAt === i ? (
                            <><span className="ad-spinner" /> {t.editor.uploading}</>
                          ) : (
                            t.editor.imageUpload
                          )}
                          <input type="file" accept="image/*" onChange={(e) => onBlockFile(i, e.target.files?.[0])} />
                        </label>
                      )}
                      <input className="ad-input" dir="ltr" style={{ marginTop: 8 }} value={b.src} onChange={(e) => updateBlock(i, { src: e.target.value })} placeholder={t.editor.imageSrc} />
                      <div className="ad-row" style={{ marginTop: 8 }}>
                        <input className="ad-input" dir={f.dir} value={b.alt} onChange={(e) => updateBlock(i, { alt: e.target.value })} placeholder={t.editor.imageAlt} />
                        <input className="ad-input" dir={f.dir} value={b.caption} onChange={(e) => updateBlock(i, { caption: e.target.value })} placeholder={t.editor.imageCaption} />
                      </div>
                    </div>
                  ) : (
                    <textarea className="ad-textarea" dir={f.dir} value={b.html} onChange={(e) => updateBlock(i, { html: e.target.value })} placeholder={t.editor.paragraphPh} />
                  )}
                </div>
              ))}
              {f.body.length === 0 && <div className="ad-empty">{t.editor.emptyBlocks}</div>}
            </div>
            <div className="ad-addblock">
              {ADD_BUTTONS.map((type) => (
                <button key={type} type="button" className="ad-chip" onClick={() => addBlock(type)}>
                  + {BLOCK_LABEL[type]}
                </button>
              ))}
            </div>
          </div>

          {/* cover image */}
          <div className="ad-card">
            <div className="ad-card__head"><h3>{t.editor.cover}</h3></div>

            {hasCover ? (
              <div className="ad-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.coverFallback}
                  alt={f.coverAlt || "cover"}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth) { set("coverWidth", img.naturalWidth); set("coverHeight", img.naturalHeight); }
                  }}
                />
                {uploading && <div className="ad-uploading"><span className="ad-spinner" />{t.editor.uploading}</div>}
                <div className="ad-cover__bar">
                  <span className="ad-num">{t.editor.detectedSize}: {f.coverWidth}×{f.coverHeight}</span>
                  <button type="button" className="ad-btn ad-btn--danger" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => { set("cover", ""); set("coverFallback", ""); }}>
                    {t.editor.removeImage}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`ad-drop${dragOver ? " ad-drop--over" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); onCoverFile(e.dataTransfer.files?.[0]); }}
              >
                {uploading ? (
                  <><span className="ad-spinner" /><span className="ad-drop__title">{t.editor.uploading}</span></>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 3v13M7 8l5-5 5 5" />
                    </svg>
                    <span className="ad-drop__title">{t.editor.dropzone}</span>
                    <span className="ad-drop__hint">{t.editor.dropzoneHint}</span>
                  </>
                )}
                <input ref={fileInput} type="file" accept="image/*" onChange={(e) => onCoverFile(e.target.files?.[0])} />
              </div>
            )}

            <div className="ad-field" style={{ marginTop: 14 }}>
              <label>{t.editor.orUrl}</label>
              <input className="ad-input" dir="ltr" value={f.coverFallback} onChange={(e) => { set("coverFallback", e.target.value); if (!f.cover) set("cover", e.target.value); }} placeholder="/images/blog/cover.webp" />
            </div>
            <div className="ad-field" style={{ marginBottom: 0 }}>
              <label>{t.editor.coverAlt} <span className="hint">— {t.editor.coverAltHint}</span></label>
              <input className="ad-input" dir={f.dir} value={f.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
            </div>
          </div>

          {/* SEO & metadata */}
          <div className="ad-card">
            <div className="ad-card__head"><h3>{t.editor.seo}</h3></div>
            <div className="ad-field">
              <label>{t.editor.metaTitle}<Counter len={(f.metaTitle || f.title).length} good={[10, 60]} /></label>
              <input className="ad-input" dir={f.dir} value={f.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={f.title || t.editor.metaTitlePh} />
            </div>
            <div className="ad-field">
              <label>{t.editor.metaDesc}<Counter len={(f.metaDescription || f.excerpt).length} good={[50, 160]} /></label>
              <textarea className="ad-textarea" dir={f.dir} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder={f.excerpt || t.editor.metaDescPh} />
            </div>
            <div className="ad-field">
              <label>{t.editor.slug} <span className="hint" dir="ltr">— farhad.bio/blog/<b>{previewSlug || "…"}</b></span></label>
              <input className="ad-input" dir="ltr" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder={t.editor.slugPh} />
            </div>
            <div className="ad-field" style={{ marginBottom: 0 }}>
              <label>{t.editor.tags} <span className="hint">— {t.editor.tagsHint}</span></label>
              <input className="ad-input" dir={f.dir} value={f.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="Open Source, هوش مصنوعی, Node.js" />
              {tags.length > 0 && (
                <div className="ad-tagrow" style={{ marginTop: 10 }}>
                  {tags.map((tag) => <span className="ad-tag" key={tag} dir="auto">{tag}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* advanced (collapsed) */}
          <div className="ad-disc">
            <button type="button" className="ad-disc__btn" aria-expanded={advanced} onClick={() => setAdvanced((v) => !v)}>
              <CogIcon /> {t.editor.advanced}
              <svg className="ad-disc__chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {advanced && (
              <div className="ad-disc__body">
                <div className="ad-row">
                  <div className="ad-field">
                    <label>{t.editor.date}</label>
                    <input className="ad-input" type="date" dir="ltr" value={f.date} onChange={(e) => set("date", e.target.value)} />
                  </div>
                  <div className="ad-field">
                    <label>{t.editor.dateFa}</label>
                    <input className="ad-input" dir="rtl" value={f.dateFa} onChange={(e) => set("dateFa", e.target.value)} placeholder="۳۰ تیر ۱۴۰۵" />
                  </div>
                </div>
                <div className="ad-row">
                  <div className="ad-field">
                    <label>{t.editor.language}</label>
                    <select className="ad-select" value={f.lang} onChange={(e) => { const lang = e.target.value; set("lang", lang); set("dir", lang === "fa" || lang === "ar" ? "rtl" : "ltr"); }}>
                      <option value="fa">{t.editor.langFa} (fa)</option>
                      <option value="en">{t.editor.langEn} (en)</option>
                    </select>
                  </div>
                  <div className="ad-field">
                    <label>{t.editor.direction}</label>
                    <select className="ad-select" value={f.dir} onChange={(e) => set("dir", e.target.value as "rtl" | "ltr")}>
                      <option value="rtl">{t.editor.dirRtl}</option>
                      <option value="ltr">{t.editor.dirLtr}</option>
                    </select>
                  </div>
                </div>
                <div className="ad-row" style={{ marginBottom: 0 }}>
                  <div className="ad-field" style={{ marginBottom: 0 }}>
                    <label>{t.editor.repo}</label>
                    <input className="ad-input" dir="ltr" value={f.repo} onChange={(e) => set("repo", e.target.value)} placeholder="https://github.com/…" />
                  </div>
                  <div className="ad-field" style={{ marginBottom: 0 }}>
                    <label>{t.editor.npm}</label>
                    <input className="ad-input" dir="ltr" value={f.npm} onChange={(e) => set("npm", e.target.value)} placeholder="package-name" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------- sticky side column ---------- */}
        <div className="ad-side-col">
          <div className="ad-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="ad-btn ad-btn--primary" disabled={saving || uploading} onClick={() => save("published")} style={{ justifyContent: "center", padding: 12 }}>
              {saving ? t.editor.saving : id ? t.editor.updatePublish : t.editor.publish}
            </button>
            <button className="ad-btn ad-btn--ghost" disabled={saving || uploading} onClick={() => save("draft")} style={{ justifyContent: "center" }}>
              {t.editor.saveDraft}
            </button>
            <p className="ad-savehint">
              {dirty ? t.editor.unsavedWarning : ""} <span dir="ltr">{t.editor.shortcutHint}</span>
            </p>
          </div>

          <div className="ad-card">
            <div className="ad-card__head"><h3>{t.editor.seoScore}</h3></div>
            <div className="ad-score">
              <div className="ad-score__ring" style={{ ["--p" as string]: score }}>
                <i className="ad-num">{faDigits(score)}</i>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.editor.checksPassed(passed, checks.length)}</div>
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
            <div className="ad-card__head"><h3>{t.editor.googlePreview}</h3></div>
            <div className="ad-serp" dir={f.dir}>
              <div className="ad-serp__url">farhad.bio <span>› blog › {previewSlug || "…"}</span></div>
              <div className="ad-serp__title">{(f.metaTitle || f.title || t.editor.postTitleFallback).slice(0, 60)}</div>
              <div className="ad-serp__desc">{(f.metaDescription || f.excerpt || t.editor.metaDescFallback).slice(0, 165)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Counter({ len, good }: { len: number; good: [number, number] }) {
  const cls = len === 0 ? "warn" : len < good[0] || len > good[1] ? "bad" : "ok";
  return <span className={`ad-counter ad-counter--${cls}`}>{faDigits(len)}</span>;
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/** Downscale to ≤1600px and re-encode (WebP where supported, else JPEG). */
async function compressImage(file: File): Promise<{ dataUrl: string; width: number; height: number; ext: "webp" | "jpg" }> {
  const img = await loadImage(file);
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  let ext: "webp" | "jpg" = "webp";
  let dataUrl = canvas.toDataURL("image/webp", 0.85);
  if (!dataUrl.startsWith("data:image/webp")) {
    ext = "jpg";
    dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  }
  return { dataUrl, width, height, ext };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
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
