// The wire contract for a post, plus the normalizer that turns loose editor
// JSON into a complete, SEO-filled record.
//
// Validation and normalization live together because they answer one question:
// "what does a valid post look like?" Splitting them lets the two drift.
import { z } from "zod";
import { slugify, stripHtml, toFaDigits } from "../../lib/text";

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), html: z.string().min(1) }),
  z.object({ type: z.literal("h3"), text: z.string().min(1) }),
  z.object({
    type: z.literal("code"),
    lang: z.string().default("bash"),
    code: z.string().min(1),
  }),
  z.object({ type: z.literal("callout"), html: z.string().min(1) }),
  z.object({
    type: z.literal("quote"),
    html: z.string().min(1),
    // Who said it. Optional, because a pull-quote from the article itself has
    // no attribution to give.
    cite: z.string().trim().default(""),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.coerce.boolean().default(false),
    // Blank rows are an artefact of typing in the editor, not content — drop
    // them here so no post ever ships an empty <li>.
    items: z
      .array(z.string())
      .transform((a) => a.map((s) => s.trim()).filter(Boolean))
      .refine((a) => a.length > 0, "a list needs at least one item"),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string().min(1),
    // Defaulted rather than required: an alt-less image is an accessibility
    // problem the editor flags, not a reason to reject the whole save.
    alt: z.string().default(""),
    caption: z.string().default(""),
    width: z.coerce.number().int().positive().default(1200),
    height: z.coerce.number().int().positive().default(800),
  }),
]);

export type Block = z.infer<typeof blockSchema>;

/**
 * What the editor is allowed to send. Almost everything is optional — the
 * normalizer derives the rest — but `title` is the one thing we cannot invent.
 */
export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  slug: z.string().trim().optional(),
  status: z.enum(["published", "draft"]).optional(),
  lang: z.string().trim().optional(),
  dir: z.enum(["rtl", "ltr"]).optional(),
  emoji: z.string().trim().optional(),
  subtitle: z.string().trim().optional(),
  excerpt: z.string().trim().optional(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  cover: z.string().trim().optional(),
  coverFallback: z.string().trim().optional(),
  coverAlt: z.string().trim().optional(),
  coverWidth: z.coerce.number().int().positive().optional(),
  coverHeight: z.coerce.number().int().positive().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  dateFa: z.string().trim().optional(),
  dateEn: z.string().trim().optional(),
  readingMinutes: z.coerce.number().int().positive().optional(),
  readingFa: z.string().trim().optional(),
  // Accepts either a real array or the comma-separated string the form sends.
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) =>
      (Array.isArray(v) ? v : String(v ?? "").split(","))
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12)
    ),
  repo: z.string().trim().optional(),
  npm: z.string().trim().optional(),
  // Unknown/garbage blocks are dropped rather than failing the whole save —
  // losing an admin's draft to one bad block is a worse outcome than dropping it.
  body: z
    .array(z.unknown())
    .optional()
    .transform((raw) =>
      (raw ?? []).flatMap((b) => {
        const parsed = blockSchema.safeParse(b);
        return parsed.success ? [parsed.data] : [];
      })
    ),
});

export type PostInputRaw = z.infer<typeof postInputSchema>;

/** A fully-populated post row, ready to write. Every field is non-optional. */
export type PostRecord = {
  slug: string;
  status: "published" | "draft";
  lang: string;
  dir: "rtl" | "ltr";
  emoji: string;
  title: string;
  subtitle: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  cover: string;
  coverFallback: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  date: string;
  dateFa: string;
  dateEn: string;
  readingMinutes: number;
  readingFa: string;
  tags: string[];
  repo: string;
  npm: string;
  body: Block[];
};

/**
 * Public post shape = the record, plus the fields the editor never sends: the
 * database identity, the read counter, and the last-saved timestamp that the
 * frontend publishes as `dateModified`.
 */
export type Post = PostRecord & {
  id: number;
  views: number;
  /** ISO-8601, or "" when the row carries no usable updated_at. */
  updatedAt: string;
};

const WORDS_PER_MINUTE = 200;

function wordCount(body: Block[], title: string): number {
  let text = title;
  for (const b of body) {
    if (b.type === "p" || b.type === "callout" || b.type === "quote") {
      text += " " + stripHtml(b.html);
    } else if (b.type === "h3") text += " " + b.text;
    else if (b.type === "code") text += " " + b.code;
    else if (b.type === "list") text += " " + b.items.join(" ");
    else if (b.type === "image") text += " " + b.caption;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Fills every derived field so the frontend never has to compute anything and
 * every post is SEO-complete even if the admin only typed a title and a body.
 */
export function normalizePost(input: PostInputRaw): PostRecord {
  const title = input.title;
  const lang = input.lang || "fa";
  const dir = input.dir ?? (lang === "fa" ? "rtl" : "ltr");
  const body = input.body ?? [];
  const excerpt = input.excerpt ?? "";

  const slug =
    slugify(input.slug || input.metaTitle || title) ||
    `post-${Date.now().toString(36)}`;

  const minutes =
    input.readingMinutes ??
    Math.max(1, Math.round(wordCount(body, title) / WORDS_PER_MINUTE));

  const date = input.date || new Date().toISOString().slice(0, 10);
  const coverFallback = input.coverFallback || input.cover || "";

  return {
    slug,
    status: input.status ?? "published",
    lang,
    dir,
    emoji: input.emoji ?? "",
    title,
    subtitle: input.subtitle ?? "",
    excerpt,
    metaTitle: input.metaTitle || title,
    metaDescription: input.metaDescription || excerpt || title,
    cover: input.cover || coverFallback,
    coverFallback,
    coverAlt: input.coverAlt || title,
    coverWidth: input.coverWidth ?? 1200,
    coverHeight: input.coverHeight ?? 800,
    date,
    dateFa: input.dateFa ?? "",
    dateEn:
      input.dateEn ||
      new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    readingMinutes: minutes,
    readingFa: input.readingFa || `${toFaDigits(minutes)} دقیقه مطالعه`,
    tags: input.tags ?? [],
    repo: input.repo ?? "",
    npm: input.npm ?? "",
    body,
  };
}
