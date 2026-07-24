import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts, site } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";

const OG_IMAGE = `${site.baseUrl}/images/blog/whisp-ai-whip-cover.png`;

export const metadata: Metadata = {
  title: "بلاگ | Farhad Bigonahi",
  description: site.blogDescription,
  alternates: { canonical: "/blog/" },
  openGraph: {
    type: "website",
    siteName: "Farhad Bigonahi",
    locale: "fa_IR",
    title: "بلاگ | Farhad Bigonahi",
    description: site.blogDescription,
    url: `${site.baseUrl}/blog/`,
    images: [{ url: OG_IMAGE, alt: "Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "بلاگ | Farhad Bigonahi",
    description: site.blogDescription,
    images: [OG_IMAGE],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="wb-page wb-js" lang="fa" dir="rtl">
      <BlogNav />

      <header className="wb-index__head" dir="rtl">
        <p className="wb-eyebrow">{site.blogEyebrow}</p>
        <h1 className="wb-index__title">{site.blogTitle}</h1>
        <p className="wb-index__sub">{site.blogSubtitle}</p>
      </header>

      <main className="wb-list">
        {posts.map((post) => (
          <Link
            key={post.slug}
            className="wb-card wb-reveal"
            href={`/blog/${post.slug}`}
          >
            <div className="wb-card__media">
              <Image
                src={post.coverFallback}
                alt={post.coverAlt}
                fill
                sizes="(max-width: 640px) 100vw, 220px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="wb-card__body" dir="rtl">
              <div className="wb-tags">
                {post.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={tag}
                    className={`wb-tag ${i === 0 ? "wb-tag--accent" : ""}`.trim()}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="wb-card__title">
                {post.emoji} {post.title}
              </h2>
              <p className="wb-card__excerpt">{post.excerpt}</p>
              <div className="wb-card__meta">
                <time dateTime={post.date}>{post.dateFa}</time>
                <span
                  className="sep"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "currentColor",
                    opacity: 0.5,
                  }}
                />
                <span>{post.readingFa}</span>
              </div>
            </div>
          </Link>
        ))}
      </main>

      <BlogFooter />
      <BlogEnhancements />
    </div>
  );
}
