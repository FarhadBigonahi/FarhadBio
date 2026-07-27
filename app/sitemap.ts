import type { MetadataRoute } from "next";
import { getAllPostsSafe } from "@/lib/content";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://farhad.bio";
  const lastModified = new Date("2026-07-21");

  // Safe variant: a backend hiccup should degrade the sitemap to its static
  // entries, never fail the build or serve a 500 to a crawler.
  const postEntries: MetadataRoute.Sitemap = (await getAllPostsSafe()).map((p) => ({
    url: `${base}/blog/${p.slug}/`,
    lastModified: p.date ? new Date(p.date) : lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1.0 },
    { url: `${base}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...postEntries,
  ];
}
