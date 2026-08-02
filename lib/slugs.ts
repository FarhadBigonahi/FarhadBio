// Post slugs that used to be canonical, and where they moved to.
//
// Post URLs are Persian: the slug is the article's own title, so Google renders
// the query terms in the URL line of the result rather than a transliteration
// nobody searches for. The three posts that predate that decision were published
// under hand-typed ASCII slugs and have links and impressions against them, so
// their old URLs answer a 301 here instead of a 404 — the equity moves to the
// new URL and exactly one of the two is ever indexed.
//
// A key in this map must never also be a live slug: the backend would serve the
// post and the redirect would never fire, or worse, two URLs would answer 200.
// Retire a slug by moving it here in the same change that renames the post.
import type { Post } from "./content";
import { slugifyFa } from "./topics";

const RETIRED: Record<string, string> = {
  "opus-5-free-clickup-ai":
    "opus-5-رایگان-بهترین-مدل-های-هوش-مصنوعی-دنیا-را-در-clickup-استفاده-کن",
  "opus-5-free-tasklet-ai":
    "opus-5-رایگان-بهترین-مدل-های-هوش-مصنوعی-دنیا-را-در-tasklet-استفاده-کن",
  whisp: "whisp-هوش-مصنوعی-به-حرفت-گوش-نمی-کنه",
};

/**
 * Path to a post, percent-encoded.
 *
 * Post slugs are Persian, so the raw form is not legal in an href, in the XML
 * of the sitemap and the feed, or in a JSON-LD @id. Encoding here rather than at
 * the call sites means no surface can forget: every link, canonical and
 * structured-data URL on the site goes through this one function. Google renders
 * the path decoded in the result line, so the reader still sees Persian.
 *
 * This lives here rather than in lib/seo.ts because the card components that
 * need it are part of client bundles, and lib/seo.ts reaches lib/api — which is
 * `server-only` and would fail the build the moment a client component imported
 * it. lib/seo.ts re-exports this, so server code has one obvious import.
 */
export const postPath = (slug: string) => `/blog/${encodeURIComponent(slug)}`;

/** The current slug for a retired one, or undefined if the slug never moved. */
export function retiredSlugTarget(slug: string): string | undefined {
  return RETIRED[slug];
}

/** Every retired slug, for the migration script and for tests. */
export const retiredSlugs = RETIRED;

/**
 * The post a Persian-script URL is asking for when it is not the canonical slug.
 *
 * The canonical slug *is* the slugified title, so this normally never fires. It
 * exists for the cases where the two drift: a post whose title was edited after
 * publication (the slug deliberately stays put — renaming a ranked URL to match
 * a typo fix is a bad trade), a title longer than the slug cap, or a slug the
 * author typed by hand. Matching the subtitle too covers the URLs people build
 * from a shared headline.
 */
export function findByTitleSlug(posts: Post[], slug: string): Post | undefined {
  const wanted = slugifyFa(slug);
  if (!wanted) return undefined;
  return posts.find(
    (p) => slugifyFa(p.title) === wanted || slugifyFa(p.subtitle) === wanted
  );
}
