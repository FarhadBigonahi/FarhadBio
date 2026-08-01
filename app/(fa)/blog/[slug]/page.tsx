import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAllPostsSafe, getPost, site, type Block, type Post } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";
import ReadingProgress from "@/components/ReadingProgress";
import PostToc, { type TocItem } from "@/components/PostToc";
import PostShare from "@/components/PostShare";
import {
  absoluteUrl,
  alternates,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  identity,
  jsonLd,
  postPath,
  postTitle,
} from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

// Prebuild known posts; new posts render on-demand (dynamicParams default true)
// and are cached via ISR + revalidatePath on publish.
export const revalidate = 60;

// Safe variant: if the backend is unreachable at build time we prebuild
// nothing and every post renders on demand instead — a slower first hit, but
// the deploy still ships.
export async function generateStaticParams() {
  return (await getAllPostsSafe()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const url = absoluteUrl(postPath(post.slug));
  // Uploaded covers are already absolute (api.farhad.bio); only site-relative
  // paths need the base URL prepended for a valid OG/Twitter image.
  const img = /^https?:\/\//.test(post.coverFallback)
    ? post.coverFallback
    : `${site.baseUrl}${post.coverFallback}`;
  const authorName = post.lang === "fa" ? identity.nameFa : identity.name;
  const title = postTitle(post);

  return {
    title: { absolute: title },
    description: post.metaDescription,
    // Post tags are the author's own topic labels — the closest thing the site
    // has to hand-picked keywords for a Persian query.
    keywords: [...post.tags, identity.nameFa, identity.name],
    alternates: alternates(postPath(post.slug)),
    openGraph: {
      type: "article",
      siteName: post.lang === "fa" ? identity.nameFa : identity.name,
      locale: post.lang === "fa" ? "fa_IR" : "en_US",
      title,
      description: post.metaDescription,
      url,
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [`${site.baseUrl}/`],
      section: post.tags[0],
      tags: post.tags,
      images: [
        {
          url: img,
          width: post.coverWidth,
          height: post.coverHeight,
          alt: post.coverAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.metaDescription,
      creator: site.twitter,
      images: [img],
    },
    authors: [{ name: authorName, url: `${site.baseUrl}/` }],
  };
}

/**
 * Up to three other posts, preferring ones that share a tag.
 *
 * Article pages were previously dead ends — the only outbound links were the
 * nav and the footer, so a crawler arriving from search had nowhere to go and
 * link equity stopped here. This gives every post inbound links from its
 * siblings.
 */
function relatedPosts(post: Post, all: Post[]): Post[] {
  const tags = new Set(post.tags);
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, shared: p.tags.filter((t) => tags.has(t)).length }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3)
    .map((x) => x.p);
}

/**
 * The posts either side of this one in publication order, for the footer's
 * previous/next links. `all` arrives newest-first, so "next" is the older post.
 */
function neighbours(post: Post, all: Post[]): { older?: Post; newer?: Post } {
  const i = all.findIndex((p) => p.slug === post.slug);
  if (i === -1) return {};
  return { newer: all[i - 1], older: all[i + 1] };
}

/**
 * A stable anchor for a heading, derived from its own text so the link keeps
 * working when the author inserts a section above it. Persian is kept as-is —
 * browsers handle a UTF-8 fragment fine, and a transliterated id would be
 * unreadable to the person sharing it.
 */
function headingId(text: string, used: Set<string>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "بخش";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

/** Heading anchors keyed by their index in `body`, plus the list the TOC renders. */
function tableOfContents(body: Block[]): {
  items: TocItem[];
  idByIndex: Map<number, string>;
} {
  const used = new Set<string>();
  const items: TocItem[] = [];
  const idByIndex = new Map<number, string>();
  body.forEach((block, i) => {
    if (block.type !== "h3") return;
    const id = headingId(block.text, used);
    idByIndex.set(i, id);
    items.push({ id, text: block.text });
  });
  return { items, idByIndex };
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

// The highlighter only understands shell syntax, so anything else is rendered
// plain rather than being coloured by rules that do not apply to it.
const SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh", "console", ""]);

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const label = lang.trim();
  return (
    <div className="wb-code">
      <div className="wb-code__bar">
        <span className="wb-code__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="wb-code__lang">{label || "code"}</span>
        <button className="wb-copy" type="button" aria-label="کپی کد">
          کپی
        </button>
      </div>
      <pre>
        <code>
          {SHELL_LANGS.has(label.toLowerCase()) ? renderBash(code) : code}
        </code>
      </pre>
    </div>
  );
}

function renderBlock(block: Block, i: number, headingIds: Map<number, string>) {
  switch (block.type) {
    case "p":
      return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "h3":
      return (
        <h3 key={i} id={headingIds.get(i)}>
          {block.text}
        </h3>
      );
    case "callout":
      return (
        <div key={i} className="wb-callout">
          <span dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      );
    case "code":
      return <CodeBlock key={i} lang={block.lang} code={block.code} />;
    case "quote":
      return (
        <figure key={i} className="wb-quote">
          <blockquote dangerouslySetInnerHTML={{ __html: block.html }} />
          {block.cite && <figcaption>— {block.cite}</figcaption>}
        </figure>
      );
    case "list": {
      const items = block.items.map((item, j) => (
        <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
      ));
      return block.ordered ? (
        <ol key={i} className="wb-list-block">
          {items}
        </ol>
      ) : (
        <ul key={i} className="wb-list-block">
          {items}
        </ul>
      );
    }
    case "image":
      return (
        <figure key={i} className="wb-figure">
          <Image
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            sizes="(max-width: 820px) 100vw, 712px"
          />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
  }
}

export default async function Article({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const all = await getAllPostsSafe();
  const related = relatedPosts(post, all);
  const { older, newer } = neighbours(post, all);
  const { items: toc, idByIndex } = tableOfContents(post.body);
  const url = absoluteUrl(postPath(post.slug));

  return (
    <div className="wb-page wb-js" lang={post.lang} dir={post.dir}>
      <ReadingProgress />
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
                {/* The byline on a Persian article should read the Persian
                    name — it is the page's most prominent author signal, and a
                    Latin byline matched no Persian-script search for him. */}
                <span className="wb-author">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={site.authorImage} alt={identity.nameFa} width={24} height={24} />{" "}
                  {post.lang === "fa" ? identity.nameFa : identity.name}
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
          <PostToc items={toc} />

          <div className="wb-prose">
            {post.body.map((block, i) => renderBlock(block, i, idByIndex))}
            {/* Only code posts carry a repo/package — a post without them must
                not ship two buttons pointing at href="". */}
            {(post.repo || post.npm) && (
            <div className="wb-actions">
              {post.repo && (
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
              )}
              {post.npm && (
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
              )}
            </div>
            )}
          </div>

          <PostShare url={url} title={post.title} />

          {(older || newer) && (
            <nav className="wb-pager" aria-label="نوشتهٔ قبلی و بعدی">
              {newer ? (
                <Link className="wb-pager__link wb-pager__link--newer" href={postPath(newer.slug)}>
                  <span className="wb-pager__dir">نوشتهٔ بعدی</span>
                  <span className="wb-pager__name">
                    {newer.emoji} {newer.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {older && (
                <Link className="wb-pager__link wb-pager__link--older" href={postPath(older.slug)}>
                  <span className="wb-pager__dir">نوشتهٔ قبلی</span>
                  <span className="wb-pager__name">
                    {older.emoji} {older.title}
                  </span>
                </Link>
              )}
            </nav>
          )}

          {related.length > 0 && (
            <aside className="wb-related" aria-labelledby="wb-related-title">
              <h2 className="wb-related__title" id="wb-related-title">
                مطالب مرتبط
              </h2>
              <ul className="wb-related__list">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={postPath(r.slug)} className="wb-related__item">
                      <span className="wb-related__emoji" aria-hidden="true">
                        {r.emoji}
                      </span>
                      <span className="wb-related__text">
                        <span className="wb-related__name">{r.title}</span>
                        <span className="wb-related__meta">
                          <time dateTime={r.date}>{r.dateFa}</time>
                          {" · "}
                          {r.readingFa}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </article>

      <BlogFooter />
      <BlogEnhancements />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          blogPostingJsonLd(post),
          breadcrumbJsonLd([
            { name: site.navHome, path: "/" },
            { name: site.navBlog, path: "/blog" },
            { name: post.title, path: postPath(post.slug) },
          ]),
        ])}
      />
    </div>
  );
}
