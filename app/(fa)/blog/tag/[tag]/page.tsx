import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostsSafe, site } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";
import PostCard from "@/components/PostCard";
import { faNum } from "@/lib/fa";
import {
  allTags,
  decodeParam,
  postsForTag,
  tagKeywords,
  tagLabel,
  tagPath,
  tagSlug,
} from "@/lib/topics";
import {
  absoluteUrl,
  alternates,
  breadcrumbJsonLd,
  identity,
  jsonLd,
  postListJsonLd,
  tagCollectionJsonLd,
  tagDescription,
  tagTitle,
} from "@/lib/seo";

// Tag archives — the site's Persian keyword landing pages.
//
// Before these existed, "هوش مصنوعی" appeared on the blog only as an unlinked
// chip that a crawler could not follow and a filter that only ran in the
// browser. Every topic now has a real URL with its own title, description,
// heading and internal links, which is what a search engine can actually rank.
//
// The slug keeps its Persian letters (see lib/topics.ts) so the query terms
// show up in the URL line of the result.

type Params = { params: Promise<{ tag: string }> };

export const revalidate = 60;

export async function generateStaticParams() {
  return allTags(await getAllPostsSafe()).map(({ tag }) => ({
    tag: tagSlug(tag),
  }));
}

/** Resolves a URL segment back to its display label and its posts. */
async function resolve(param: string) {
  // Decode first — the segment arrives percent-encoded — then re-normalise, so
  // a hand-typed URL with odd spacing or an Arabic yeh still lands.
  const slug = tagSlug(decodeParam(param));
  const all = await getAllPostsSafe();
  const label = tagLabel(all, slug);
  return label ? { label, posts: postsForTag(all, slug), all } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const found = await resolve(tag);
  if (!found) return { robots: { index: false, follow: true } };

  const title = tagTitle(found.label);
  const description = tagDescription(found.label, found.posts.length);
  const url = absoluteUrl(tagPath(found.label));
  const cover = found.posts[0]?.coverFallback ?? "";
  const image = cover
    ? /^https?:\/\//.test(cover)
      ? cover
      : `${site.baseUrl}${cover}`
    : undefined;

  return {
    title: { absolute: title },
    description,
    keywords: tagKeywords(found.label),
    alternates: alternates(tagPath(found.label)),
    openGraph: {
      type: "website",
      siteName: identity.nameFa,
      locale: "fa_IR",
      title,
      description,
      url,
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      creator: site.twitter,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function TagArchive({ params }: Params) {
  const { tag } = await params;
  const found = await resolve(tag);
  if (!found) notFound();

  const { label, posts, all } = found;
  const others = allTags(all).filter(({ tag: t }) => tagSlug(t) !== tagSlug(label));
  const url = absoluteUrl(tagPath(label));

  return (
    <div className="wb-page wb-js" lang="fa" dir="rtl">
      <BlogNav />

      <header className="wb-index__head" dir="rtl">
        <p className="wb-eyebrow">
          <Link href="/blog">بلاگ {identity.nameFa}</Link>
        </p>
        {/* The h1 is the topic itself: this page exists to answer one query. */}
        <h1 className="wb-index__title">{label}</h1>
        <p className="wb-index__sub">
          همهٔ نوشته‌های {identity.nameFa} دربارهٔ {label}.
        </p>
        <p className="wb-index__stats">
          <span>{faNum(posts.length)} نوشته</span>
        </p>
      </header>

      <main className="wb-list">
        {posts.map((post, i) => (
          <PostCard key={post.slug} post={post} priority={i === 0} />
        ))}
      </main>

      {others.length > 0 && (
        <nav className="wb-topics" aria-labelledby="wb-topics-title">
          <h2 className="wb-topics__title" id="wb-topics-title">
            موضوعات دیگر
          </h2>
          <div className="wb-topics__list">
            {others.map(({ tag: t, count }) => (
              <Link key={t} className="wb-chip" href={tagPath(t)}>
                {t}
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
          tagCollectionJsonLd(label, posts),
          postListJsonLd(posts, url, tagTitle(label)),
          breadcrumbJsonLd([
            { name: site.navHome, path: "/" },
            { name: site.navBlog, path: "/blog" },
            { name: label, path: tagPath(label) },
          ]),
        ])}
      />
    </div>
  );
}
