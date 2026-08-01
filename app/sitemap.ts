import type { MetadataRoute } from "next";
import { getAllPostsSafe } from "@/lib/content";
import { absoluteUrl, postPath } from "@/lib/seo";

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
  ];
}
