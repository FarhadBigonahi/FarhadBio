import { getAllPostsSafe, site } from "@/lib/content";
import {
  DESCRIPTION_FA,
  absoluteUrl,
  identity,
  postPath,
} from "@/lib/seo";

// RSS 2.0 for the Persian blog.
//
// Feed readers are still how a lot of the Iranian dev audience follows a blog,
// and a discoverable feed is an independent crawl path into every post. Linked
// from every page via the alternates.types entry in lib/seo.ts.

export const revalidate = 300;

/** Escapes the five characters that are not legal as raw text in XML. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const posts = await getAllPostsSafe();
  const self = `${site.baseUrl}/feed.xml`;
  const updated = posts[0]?.date
    ? new Date(posts[0].date).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = absoluteUrl(postPath(post.slug));
      const cover = /^https?:\/\//.test(post.coverFallback)
        ? post.coverFallback
        : `${site.baseUrl}${post.coverFallback}`;
      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${xml(post.excerpt || post.metaDescription)}</description>
      <dc:creator>${xml(identity.nameFa)}</dc:creator>
      <enclosure url="${xml(cover)}" type="image/png" length="0" />
${post.tags.map((t) => `      <category>${xml(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(`${site.blogTitle} — ${identity.nameFa}`)}</title>
    <link>${xml(absoluteUrl("/blog"))}</link>
    <description>${xml(DESCRIPTION_FA)}</description>
    <language>fa-ir</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
