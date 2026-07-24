import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, site, type Block } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";
import { blogPostingJsonLd } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `${site.baseUrl}/blog/${post.slug}/`;
  const img = `${site.baseUrl}${post.coverFallback}`;
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.slug}/` },
    openGraph: {
      type: "article",
      siteName: "Farhad Bigonahi",
      locale: "fa_IR",
      title: post.metaTitle,
      description: post.metaDescription,
      url,
      images: [{ url: img, alt: post.coverAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [img],
    },
  };
}

/** Minimal bash highlighter matching the original token classes. */
function renderBash(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  code.split("\n").forEach((line, li) => {
    if (li > 0) out.push("\n");
    line.split(" ").forEach((tok, ti) => {
      if (ti > 0) out.push(" ");
      if (ti === 0 && tok) {
        out.push(
          <span className="tok-cmd" key={`${li}-${ti}`}>
            {tok}
          </span>
        );
      } else if (tok.startsWith("-")) {
        out.push(
          <span className="tok-flag" key={`${li}-${ti}`}>
            {tok}
          </span>
        );
      } else {
        out.push(tok);
      }
    });
  });
  return out;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="wb-code">
      <div className="wb-code__bar">
        <span className="wb-code__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="wb-code__lang">{lang}</span>
        <button className="wb-copy" type="button" aria-label="کپی کد">
          کپی
        </button>
      </div>
      <pre>
        <code>{renderBash(code)}</code>
      </pre>
    </div>
  );
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "p":
      return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "h3":
      return <h3 key={i}>{block.text}</h3>;
    case "callout":
      return (
        <div key={i} className="wb-callout">
          <span dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      );
    case "code":
      return <CodeBlock key={i} lang={block.lang} code={block.code} />;
  }
}

export default async function Article({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="wb-page wb-js" lang={post.lang} dir={post.dir}>
      <BlogNav />
      <article className="wb-article">
        <header className="wb-hero">
          <div className="wb-hero__glow" aria-hidden="true" />
          <div className="wb-hero__inner wb-reveal">
            <div className="wb-hero__text">
              <Link className="wb-back" href="/blog">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M11 6l6 6-6 6M6 12h11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>بازگشت به بلاگ</span>
              </Link>
              <div className="wb-tags">
                {post.tags.map((tag, i) => (
                  <span
                    key={tag}
                    className={`wb-tag ${i === 0 ? "wb-tag--accent" : ""}`.trim()}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="wb-hero__title">
                <span className="wb-hero__emoji">{post.emoji}</span> {post.title}
              </h1>
              <p className="wb-hero__subtitle">{post.subtitle}</p>
              <div className="wb-hero__meta">
                <span className="wb-author">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={site.authorImage} alt={site.author} width={24} height={24} />{" "}
                  {site.author}
                </span>
                <span className="sep" />
                <time dateTime={post.date}>{post.dateFa}</time>
                <span className="sep" />
                <span>{post.readingFa}</span>
              </div>
            </div>
            <figure className="wb-hero__media">
              <Image
                src={post.coverFallback}
                alt={post.coverAlt}
                width={post.coverWidth}
                height={post.coverHeight}
                sizes="(max-width: 820px) 74vw, 326px"
                priority
              />
            </figure>
          </div>
        </header>

        <div className="wb-wrap">
          <div className="wb-prose">
            {post.body.map((block, i) => renderBlock(block, i))}
            <div className="wb-actions">
              <a
                className="wb-btn wb-btn--primary"
                href={post.repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                </svg>
                <span>مشاهده در گیت‌هاب</span>
              </a>
              <a
                className="wb-btn wb-btn--ghost"
                href={`https://www.npmjs.com/package/${post.npm}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2 5h20v14H12v-2h6V7H4v10h4V9h6v10H2V5Z" />
                </svg>
                <span>پکیج npm</span>
              </a>
            </div>
          </div>
        </div>
      </article>

      <BlogFooter />
      <BlogEnhancements />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostingJsonLd(post)),
        }}
      />
    </div>
  );
}
