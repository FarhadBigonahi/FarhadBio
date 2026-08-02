import type { MetadataRoute } from "next";
import { getAllPostsSafe } from "@/lib/content";
import { absoluteUrl, postPath } from "@/lib/seo";
import { allTags, postsForTag, tagPath, tagSlug } from "@/lib/topics";

export const revalidate = 60;

/** Bump when the homepage copy actually changes. */
const HOME_MODIFIED = new Date("2026-07-21");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPostsSafe();

  // Safe variant: a backend hiccup should degrade the sitemap to its static
  // entries, never fail the build or serve a 500 to a crawler.
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(postPath(p.slug)),
    lastModified: p.date ? new Date(p.date) : new Date(),
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
  const newestPost = posts
    .map((p) => (p.date ? new Date(p.date).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const blogModified = newestPost ? new Date(newestPost) : new Date();

  // Tag archives. Each is a Persian keyword landing page, and each is only as
  // fresh as its newest post — a shared date would tell crawlers that a topic
  // nobody has written about in months was updated today.
  const tagEntries: MetadataRoute.Sitemap = allTags(posts).map(({ tag }) => {
    const tagged = postsForTag(posts, tagSlug(tag));
    const newest = tagged
      .map((p) => (p.date ? new Date(p.date).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    return {
      url: absoluteUrl(tagPath(tag)),
      lastModified: newest ? new Date(newest) : blogModified,
      changeFrequency: "weekly",
      // Below the index and the posts themselves: these exist to be found, not
      // to outrank the articles they point at.
      priority: 0.5,
    };
  });

  return [
    {
      url: absoluteUrl("/"),
      lastModified: HOME_MODIFIED,
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
