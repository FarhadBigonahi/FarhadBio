import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://farhad.bio";
  const lastModified = new Date("2026-07-21");

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${base}/blog/${p.slug}/`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1.0 },
    { url: `${base}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...postEntries,
  ];
}
