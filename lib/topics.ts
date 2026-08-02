// Topics: what a tag is called, what its URL looks like, and what Iranians
// actually type into Google to find it.
//
// A post's `tags` are the author's own short labels — "هوش مصنوعی", "Opus 5".
// They are accurate but narrow: nobody searches the bare label, they search
// "هوش مصنوعی رایگان" or "کلاد اوپوس ۵". This file is the bridge between the
// two, so a post written with five tags still reaches the phrases people type
// without the author having to hand-maintain a keyword list per article.
import type { Post } from "./content";

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Folds the spelling variants that make two identical Persian words compare
 * unequal: the Arabic yeh/kaf that most keyboards still emit, the several
 * hamza carriers, and the zero-width non-joiner that "متن‌باز" carries but
 * "متن باز" does not. Without this, one tag typed two ways becomes two topics.
 */
export function normalizeFa(input: string): string {
  return input
    .replace(/[يى]/g, "ی") // ي, ى  -> ی
    .replace(/ك/g, "ک") // ك      -> ک
    .replace(/[أإآ]/g, "ا") // أ, إ, آ -> ا
    .replace(/ة/g, "ه") // ة      -> ه
    .replace(/[‌‏‎]/g, " ") // ZWNJ / bidi marks -> space
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Tag URLs                                                            */
/* ------------------------------------------------------------------ */

/**
 * A dynamic route segment, percent-decoded.
 *
 * The App Router hands `params` back exactly as they appear in the URL — it
 * does *not* decode them — so a Persian segment arrives as "%D9%87%D9%88…".
 * Every lookup here compares against real Persian text, and the API client
 * encodes the slug again on its way out, so skipping this turns a Persian URL
 * into a 404 at best and a double-encoded request at worst.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A stray "%" that is not a valid escape. Use the segment as typed rather
    // than throwing a 500 at whoever mistyped a URL.
    return value;
  }
}

/**
 * Slugify that keeps Unicode letters, so Persian text produces a readable
 * Persian slug instead of being stripped to nothing. Mirrors the backend's
 * `slugify` (server/src/lib/text.ts) with the spelling folding added, so a slug
 * computed here matches one the backend stored.
 */
export function slugifyFa(input: string): string {
  return truncateSlug(
    normalizeFa(input)
      .replace(/['"]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/** The length cap, mirroring MAX_SLUG in server/src/lib/text.ts. */
const MAX_SLUG = 80;

/**
 * Cuts a slug to the cap on a word boundary — the same rule the backend applies
 * when it stores one, so a slug computed here still matches the slug on the row.
 */
function truncateSlug(slug: string): string {
  if (slug.length <= MAX_SLUG) return slug;
  const cut = slug.slice(0, MAX_SLUG + 1);
  const lastBreak = cut.lastIndexOf("-");
  const kept = lastBreak > 0 ? cut.slice(0, lastBreak) : cut.slice(0, MAX_SLUG);
  return kept.replace(/-+$/, "");
}

/**
 * The slug for a tag archive.
 *
 * Persian letters are kept rather than transliterated. A tag archive is the one
 * URL on the site whose whole job is to match a Persian query, and Google
 * renders the path decoded in the result — so "/blog/tag/هوش-مصنوعی" shows the
 * query terms in the URL line, where a transliteration would show nothing.
 */
export function tagSlug(tag: string): string {
  return slugifyFa(tag) || "topic";
}

/**
 * Path to a tag archive, percent-encoded.
 *
 * Encoding here rather than at the call sites means canonicals, sitemap entries
 * and JSON-LD @ids all carry a URL that is legal in an href and in an XML
 * document — the three places a raw Persian path would have caused trouble.
 */
export function tagPath(tag: string): string {
  return `/blog/tag/${encodeURIComponent(tagSlug(tag))}`;
}

/** Every tag in the archive, most-used first, with its post count. */
export function allTags(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tagSlug(tag);
      const seen = counts.get(key);
      // First spelling wins as the display label, so an archive is not renamed
      // by whichever post happens to sort last.
      if (seen) seen.count++;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "fa")
  );
}

/** The posts carrying a tag, matched on slug so spelling variants still hit. */
export function postsForTag(posts: Post[], slug: string): Post[] {
  return posts.filter((p) => p.tags.some((t) => tagSlug(t) === slug));
}

/**
 * How many posts a topic needs before its archive is worth indexing.
 *
 * An archive holding one post is not a topic page, it is a second copy of that
 * post's title and cover under a different URL — and shipping nine of them for
 * three articles asks Google to choose between an article and a thinner page
 * about the same thing. Two is the point where the page starts saying something
 * the article does not: that there is more than one of these.
 */
export const MIN_INDEXABLE_TAG_POSTS = 2;

/**
 * Whether a tag archive should be indexed.
 *
 * Below the threshold the page still renders, is still linked, and is still
 * crawlable — it just carries `noindex, follow`, so the crawl path to the post
 * survives while the near-duplicate stays out of the index. The archives start
 * indexing themselves as soon as a topic earns a second post; nothing has to be
 * revisited.
 */
export function isIndexableTag(postCount: number): boolean {
  return postCount >= MIN_INDEXABLE_TAG_POSTS;
}

/** The display label for a tag slug, or undefined if nothing carries it. */
export function tagLabel(posts: Post[], slug: string): string | undefined {
  for (const post of posts) {
    for (const tag of post.tags) if (tagSlug(tag) === slug) return tag;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Keywords                                                            */
/* ------------------------------------------------------------------ */

/**
 * Search phrases per topic, keyed by the normalised tag.
 *
 * These are query strings, not synonyms: each line is something a Persian
 * speaker would plausibly type. Latin spellings sit alongside Persian ones
 * because Iranian developers switch scripts mid-query ("نصب nodejs").
 *
 * Adding a topic here immediately improves every past and future post carrying
 * that tag — no post needs editing.
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "هوش مصنوعی": [
    "هوش مصنوعی رایگان",
    "بهترین هوش مصنوعی",
    "ابزار هوش مصنوعی",
    "چت هوش مصنوعی",
    "هوش مصنوعی برای برنامه نویسی",
    "آموزش هوش مصنوعی",
    "AI",
  ],
  "opus 5": [
    "اوپوس ۵",
    "کلاد اوپوس",
    "Claude Opus 5",
    "Opus 5 رایگان",
    "بهترین مدل هوش مصنوعی",
  ],
  gpt: ["چت جی پی تی", "ChatGPT", "جی پی تی رایگان", "چت جی پی تی فارسی"],
  gemini: ["جمینای", "جمنای گوگل", "Gemini رایگان"],
  clickup: ["کلیک اپ", "ClickUp Brain", "کلیک آپ هوش مصنوعی", "مدیریت پروژه"],
  tasklet: ["تسکلت", "Tasklet AI", "تسکلت رایگان"],
  رایگان: [
    "رایگان",
    "بدون کارت بانکی",
    "اکانت رایگان",
    "نسخه رایگان",
    "کردیت رایگان",
  ],
  "open source": [
    "متن باز",
    "اپن سورس",
    "پروژه متن باز",
    "open source",
    "سورس باز",
  ],
  ابزار: ["ابزار برنامه نویسی", "ابزار رایگان برنامه نویسی", "معرفی ابزار"],
  "ابزار هوش مصنوعی": [
    "بهترین ابزار هوش مصنوعی",
    "ابزار هوش مصنوعی رایگان",
    "معرفی ابزار هوش مصنوعی",
  ],
  "چت هوش مصنوعی": ["چت بات", "چت با هوش مصنوعی", "هوش مصنوعی فارسی"],
  "ابزار برنامه نویسی": ["ابزار توسعه", "ابزار رایگان برنامه نویسی", "CLI"],
  "کردیت رایگان": ["کردیت رایگان", "سهمیه رایگان", "اعتبار رایگان"],
  npm: ["نصب پکیج npm", "npm install", "پکیج نود"],
  "node.js": ["نود جی اس", "nodejs", "npm", "آموزش Node.js", "پکیج npm"],
  react: ["ری اکت", "آموزش ری اکت", "reactjs", "فرانت اند"],
  "next.js": ["نکست جی اس", "آموزش Next.js", "nextjs", "رندر سمت سرور"],
  typescript: ["تایپ اسکریپت", "آموزش TypeScript"],
  javascript: ["جاوا اسکریپت", "آموزش جاوا اسکریپت"],
  "c#": ["سی شارپ", "آموزش سی شارپ", "دات نت", "csharp"],
  "asp.net core": [
    "ای اس پی دات نت کور",
    "asp.net core",
    "بک اند دات نت",
    "وب ای پی آی",
  ],
  "sql server": ["اس کیو ال سرور", "پایگاه داده", "دیتابیس"],
  "وایب کدینگ": [
    "vibe coding",
    "کدنویسی با هوش مصنوعی",
    "برنامه نویسی با هوش مصنوعی",
  ],
  "برنامه نویسی": [
    "آموزش برنامه نویسی",
    "یادگیری برنامه نویسی",
    "برنامه نویسی وب",
    "شروع برنامه نویسی",
  ],
  "ایمیل موقت": ["تمپ میل", "temp mail", "ایمیل یکبار مصرف"],
};

/**
 * Phrases carried by every Persian page. The author's own name in both scripts
 * is first: it is the query the site most needs to own, and it is the one
 * phrase a per-topic list would never contain.
 */
const BASE_KEYWORDS = [
  "فرهاد بیگناهی",
  "Farhad Bigonahi",
  "بلاگ فرهاد بیگناهی",
  "farhad.bio",
  "بلاگ برنامه نویسی",
];

/**
 * The topics offered as one-click suggestions in the editor, in the spelling
 * they should be stored in.
 *
 * TOPIC_KEYWORDS is keyed by the normalised form ("node.js", "c#"), which is
 * the wrong thing to show a human, so the display spellings are listed here.
 * Anything picked from this list is guaranteed to have search phrases behind
 * it — which is the whole point of suggesting these rather than free text.
 */
export const SUGGESTED_TAGS = [
  "هوش مصنوعی",
  "ابزار هوش مصنوعی",
  "چت هوش مصنوعی",
  "Opus 5",
  "GPT",
  "Gemini",
  "ClickUp",
  "Tasklet",
  "رایگان",
  "کردیت رایگان",
  "ایمیل موقت",
  "Open Source",
  "ابزار",
  "ابزار برنامه نویسی",
  "برنامه نویسی",
  "وایب کدینگ",
  "Node.js",
  "npm",
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "C#",
  "ASP.NET Core",
  "SQL Server",
];

/** Case-insensitive, spelling-tolerant lookup into TOPIC_KEYWORDS. */
function keywordsFor(tag: string): string[] {
  return TOPIC_KEYWORDS[normalizeFa(tag)] ?? [];
}

/**
 * De-duplicates while keeping the first spelling of each phrase, so a list can
 * be assembled from several sources without repeating a term in two scripts'
 * worth of near-identical forms.
 */
function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeFa(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

// Long enough to cover a topic's real query variants, short enough that the
// list still reads as a description of the page rather than as a keyword dump.
const MAX_KEYWORDS = 22;

/**
 * Tags, then the site-wide phrases, then each topic's search phrases.
 *
 * The base list sits ahead of the expansions on purpose: a post with five tags
 * generates more topic phrases than the cap allows, and when the name came last
 * "فرهاد بیگناهی" — the one query the site most needs to own — was the first
 * thing the slice threw away.
 */
export function expandKeywords(tags: string[], extra: string[] = []): string[] {
  return dedupe([
    ...tags,
    ...extra,
    ...BASE_KEYWORDS,
    ...tags.flatMap(keywordsFor),
  ]).slice(0, MAX_KEYWORDS);
}

/** The keyword set for a single post. */
export function postKeywords(post: Post): string[] {
  return expandKeywords(post.tags);
}

/** The keyword set for a tag archive — that topic's phrases, weighted first. */
export function tagKeywords(tag: string): string[] {
  return expandKeywords([tag], [`${tag} فارسی`, `آموزش ${tag}`]);
}
