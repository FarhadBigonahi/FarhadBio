// All SQL for posts lives here. Routes never see a query, the repo never sees
// an HTTP request — so swapping SQLite for Postgres later touches this file only.
import type { Row } from "@libsql/client";
import { db } from "../../db/client";
import type { Block, Post, PostRecord } from "./posts.schema";

const COLUMNS = `id,slug,status,lang,dir,emoji,title,subtitle,excerpt,meta_title,
  meta_description,cover,cover_fallback,cover_alt,cover_width,cover_height,date,
  date_fa,date_en,reading_minutes,reading_fa,tags,repo,npm,body`;

function safeJson<T>(value: unknown, fallback: T): T {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** snake_case DB row -> camelCase wire shape the frontend consumes. */
function toPost(r: Row): Post {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    status: String(r.status) === "draft" ? "draft" : "published",
    lang: String(r.lang),
    dir: String(r.dir) === "ltr" ? "ltr" : "rtl",
    emoji: String(r.emoji),
    title: String(r.title),
    subtitle: String(r.subtitle),
    excerpt: String(r.excerpt),
    metaTitle: String(r.meta_title),
    metaDescription: String(r.meta_description),
    cover: String(r.cover),
    coverFallback: String(r.cover_fallback),
    coverAlt: String(r.cover_alt),
    coverWidth: Number(r.cover_width),
    coverHeight: Number(r.cover_height),
    date: String(r.date),
    dateFa: String(r.date_fa),
    dateEn: String(r.date_en),
    readingMinutes: Number(r.reading_minutes),
    readingFa: String(r.reading_fa),
    tags: safeJson<string[]>(r.tags, []),
    repo: String(r.repo),
    npm: String(r.npm),
    body: safeJson<Block[]>(r.body, []),
  };
}

/** Values in INSERT/UPDATE column order — one array, used by both writers. */
function toArgs(p: PostRecord) {
  return [
    p.slug,
    p.status,
    p.lang,
    p.dir,
    p.emoji,
    p.title,
    p.subtitle,
    p.excerpt,
    p.metaTitle,
    p.metaDescription,
    p.cover,
    p.coverFallback,
    p.coverAlt,
    p.coverWidth,
    p.coverHeight,
    p.date,
    p.dateFa,
    p.dateEn,
    p.readingMinutes,
    p.readingFa,
    JSON.stringify(p.tags),
    p.repo,
    p.npm,
    JSON.stringify(p.body),
  ];
}

export async function listPublished(): Promise<Post[]> {
  const res = await db().execute(
    `SELECT ${COLUMNS} FROM posts WHERE status='published'
     ORDER BY date DESC, id DESC`
  );
  return res.rows.map(toPost);
}

export async function listAll(): Promise<Post[]> {
  const res = await db().execute(
    `SELECT ${COLUMNS} FROM posts ORDER BY updated_at DESC, id DESC`
  );
  return res.rows.map(toPost);
}

export async function findBySlug(slug: string): Promise<Post | null> {
  const res = await db().execute({
    sql: `SELECT ${COLUMNS} FROM posts WHERE slug=? AND status='published' LIMIT 1`,
    args: [slug],
  });
  return res.rows[0] ? toPost(res.rows[0]) : null;
}

export async function findById(id: number): Promise<Post | null> {
  const res = await db().execute({
    sql: `SELECT ${COLUMNS} FROM posts WHERE id=? LIMIT 1`,
    args: [id],
  });
  return res.rows[0] ? toPost(res.rows[0]) : null;
}

export async function slugTaken(slug: string, exceptId = 0): Promise<boolean> {
  const res = await db().execute({
    sql: "SELECT 1 FROM posts WHERE slug=? AND id<>? LIMIT 1",
    args: [slug, exceptId],
  });
  return res.rows.length > 0;
}

export async function insert(p: PostRecord): Promise<number> {
  const now = Date.now();
  const res = await db().execute({
    sql: `INSERT INTO posts
      (slug,status,lang,dir,emoji,title,subtitle,excerpt,meta_title,meta_description,
       cover,cover_fallback,cover_alt,cover_width,cover_height,date,date_fa,date_en,
       reading_minutes,reading_fa,tags,repo,npm,body,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [...toArgs(p), now, now],
  });
  return Number(res.lastInsertRowid ?? 0);
}

export async function update(id: number, p: PostRecord): Promise<void> {
  await db().execute({
    sql: `UPDATE posts SET
      slug=?,status=?,lang=?,dir=?,emoji=?,title=?,subtitle=?,excerpt=?,
      meta_title=?,meta_description=?,cover=?,cover_fallback=?,cover_alt=?,
      cover_width=?,cover_height=?,date=?,date_fa=?,date_en=?,
      reading_minutes=?,reading_fa=?,tags=?,repo=?,npm=?,body=?,updated_at=?
      WHERE id=?`,
    args: [...toArgs(p), Date.now(), id],
  });
}

export async function remove(id: number): Promise<void> {
  await db().execute({ sql: "DELETE FROM posts WHERE id=?", args: [id] });
}

export async function countPublished(): Promise<number> {
  const res = await db().execute(
    "SELECT COUNT(*) n FROM posts WHERE status='published'"
  );
  return Number(res.rows[0]?.n ?? 0);
}
