import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllPostsSafe, site } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";
import BlogList from "@/components/BlogList";
import { faNum } from "@/lib/fa";
import { allTags, expandKeywords, tagPath } from "@/lib/topics";
import {
  DESCRIPTION_FA,
  absoluteUrl,
  alternates,
  blogJsonLd,
  blogListJsonLd,
  breadcrumbJsonLd,
  identity,
  jsonLd,
  twitterCreator,
} from "@/lib/seo";

const TITLE = `بلاگ ${identity.nameFa} — برنامه‌نویسی و هوش مصنوعی`;

// Broad phrases the archive should own regardless of which posts exist today;
// the per-topic ones are derived from the tags actually in use.
const SEED_KEYWORDS = [
  "بلاگ برنامه نویسی",
  "آموزش برنامه نویسی",
  "هوش مصنوعی",
  "ابزارهای متن‌باز",
  "وایب کدینگ",
  "Farhad Bigonahi blog",
];

// Statically cached, but revalidated so new posts appear without a redeploy.
export const revalidate = 60;

/**
 * Built per-request rather than declared statically so the Open Graph card can
 * name the newest cover *and its real dimensions*. The old static block claimed
 * 1200×630 for a 941×1672 portrait poster — every platform that trusts those
 * numbers to reserve a crop was rendering a broken card.
 */
export async function generateMetadata(): Promise<Metadata> {
  const posts = await getAllPostsSafe();
  const newest = posts[0];
  const cover = newest?.coverFallback ?? "";
  const image = cover
    ? {
        url: /^https?:\/\//.test(cover) ? cover : `${site.baseUrl}${cover}`,
        width: newest!.coverWidth,
        height: newest!.coverHeight,
        alt: newest!.coverAlt || TITLE,
      }
    : undefined;

  return {
    // Absolute, so the layout's "%s | فرهاد بیگناهی" template does not repeat the
    // name that is already in the title.
    title: { absolute: TITLE },
    description: DESCRIPTION_FA,
    keywords: expandKeywords(
      allTags(posts).map((t) => t.tag),
      SEED_KEYWORDS
    ),
    alternates: alternates("/blog"),
    openGraph: {
      type: "website",
      siteName: identity.nameFa,
      locale: "fa_IR",
      alternateLocale: ["en_US"],
      title: TITLE,
      description: DESCRIPTION_FA,
      url: absoluteUrl("/blog"),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION_FA,
      ...twitterCreator(),
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default async function BlogIndex() {
  const posts = await getAllPosts();
  const topics = allTags(posts);

  return (
    <div className="wb-page wb-js" lang="fa" dir="rtl">
      <BlogNav />

      <header className="wb-index__head" dir="rtl">
        <p className="wb-eyebrow">{site.blogEyebrow}</p>
        <h1 className="wb-index__title">{site.blogTitle}</h1>
        <p className="wb-index__sub">{site.blogSubtitle}</p>
        {/* Read counts are deliberately not shown to readers — they are an
            author-facing metric and live on the /admin dashboard only. */}
        <p className="wb-index__stats">
          <span>{faNum(posts.length)} نوشته</span>
        </p>
      </header>

      <BlogList posts={posts} />

      {/* The chips inside BlogList filter in the browser; these are real links.
          A crawler cannot press a button, so without this row the tag archives
          would have had no inbound link from the page that ranks best. */}
      {topics.length > 0 && (
        <nav className="wb-topics" aria-labelledby="wb-topics-title">
          <h2 className="wb-topics__title" id="wb-topics-title">
            موضوعات
          </h2>
          <div className="wb-topics__list">
            {topics.map(({ tag, count }) => (
              <Link key={tag} className="wb-chip" href={tagPath(tag)}>
                {tag}
                <span className="wb-chip__count">{faNum(count)}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      <BlogFooter />
      <BlogEnhancements />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          blogJsonLd(),
          blogListJsonLd(posts),
          breadcrumbJsonLd([
            { name: site.navHome, path: "/" },
            { name: site.navBlog, path: "/blog" },
          ]),
        ])}
      />
    </div>
  );
}
