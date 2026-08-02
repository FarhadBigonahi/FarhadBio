import type { MetadataRoute } from "next";
import { getAllPostsSafe, type Post } from "@/lib/content";
import { absoluteUrl, modifiedDate, postPath } from "@/lib/seo";
import {
  allTags,
  isIndexableTag,
  postsForTag,
  tagPath,
  tagSlug,
} from "@/lib/topics";

export const revalidate = 60;

/** Bump when the homepage copy actually changes. */
const HOME_MODIFIED = new Date("2026-07-21");

/**
 * When a post last changed, in epoch milliseconds.
 *
 * Every `lastmod` on this page derives from this, so the sitemap and the
 * `dateModified` in each article's JSON-LD can never disagree — a crawler that
 * finds two different answers to "when did this change?" trusts neither.
 */
function modifiedMs(post: Post): number {
  const ms = Date.parse(modifiedDate(post));
  return Number.isNaN(ms) ? 0 : ms;
}

/** The most recent modification across a set of posts, or 0 if there are none. */
function newestOf(posts: Post[]): number {
  return posts.map(modifiedMs).reduce((a, b) => Math.max(a, b), 0);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPostsSafe();

  // Safe variant: a backend hiccup should degrade the sitemap to its static
  // entries, never fail the build or serve a 500 to a crawler.
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(postPath(p.slug)),
    // The last *edit*, not the publication day. Reporting the publish date here
    // meant a rewritten article was announced to crawlers as untouched, so the
    // recrawl it needed never got prioritised.
    lastModified: new Date(modifiedMs(p) || Date.now()),
    changeFrequency: "monthly",
    priority: 0.7,
    // Listing the cover here is what gets a post's artwork into Google Images
    // and into the thumbnail slot on a Persian result.
    images: [
      /^https?:\/\//.test(p.coverFallback)
        ? p.coverFallback
        : absoluteUrl(p.coverFallback),
    ],
  }));

  // The blog index is only as fresh as its newest post — hardcoding a date here
  // told crawlers the archive had not moved since the day it was written.
  const newestPost = newestOf(posts);
  const blogModified = newestPost ? new Date(newestPost) : new Date();

  // Tag archives. Each is a Persian keyword landing page, and each is only as
  // fresh as its newest post — a shared date would tell crawlers that a topic
  // nobody has written about in months was updated today.
  // Archives below the indexing threshold are left out entirely: the page they
  // point at carries `noindex`, and a sitemap that submits a URL the page then
  // refuses is a contradiction Search Console reports as an error.
  const tagEntries: MetadataRoute.Sitemap = allTags(posts)
    .map(({ tag }) => ({ tag, tagged: postsForTag(posts, tagSlug(tag)) }))
    .filter(({ tagged }) => isIndexableTag(tagged.length))
    .map(({ tag, tagged }) => {
      const newest = newestOf(tagged);
      return {
        url: absoluteUrl(tagPath(tag)),
        lastModified: newest ? new Date(newest) : blogModified,
        changeFrequency: "weekly" as const,
        // Below the index and the posts themselves: these exist to be found,
        // not to outrank the articles they point at.
        priority: 0.5,
      };
    });

  return [
    {
      url: absoluteUrl("/"),
      // The homepage renders the three newest posts, so publishing changes it
      // whether or not anyone edits its copy. Taking the later of the two means
      // the hand-typed constant only ever has to move when the *static* copy
      // does — it can no longer silently understate the page's freshness.
      lastModified: new Date(
        Math.max(HOME_MODIFIED.getTime(), newestPost)
      ),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: blogModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...postEntries,
    ...tagEntries,
  ];
}
