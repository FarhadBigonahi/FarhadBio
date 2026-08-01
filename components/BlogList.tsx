"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/content";
import { faNum } from "@/lib/fa";

// The blog index list, with search and tag filtering.
//
// A client component, but every post is still in the server-rendered HTML: the
// initial state is "no filter", so a crawler (and a reader with JavaScript
// disabled) sees the complete archive. Filtering is an enhancement on top of a
// page that is already whole.

/** Tags across the archive, most-used first — the ones worth offering as chips. */
function topTags(posts: Post[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fa"))
    .slice(0, limit)
    .map(([tag]) => tag);
}

/** Everything about a post a reader might plausibly type into the search box. */
function haystack(p: Post): string {
  return [p.title, p.subtitle, p.excerpt, p.slug, ...p.tags]
    .join(" ")
    .toLowerCase();
}

export default function BlogList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  // Reveal-on-scroll is a first-paint effect wired up by BlogEnhancements. Once
  // the list can change under it, cards must render visible by default or a
  // filtered-in card would stay at opacity 0 with nothing left to observe it.
  const [interacted, setInteracted] = useState(false);

  const tags = useMemo(() => topTags(posts), [posts]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) => (!tag || p.tags.includes(tag)) && (!q || haystack(p).includes(q))
    );
  }, [posts, query, tag]);

  function setFilter(next: () => void) {
    setInteracted(true);
    next();
  }

  const filtering = Boolean(query.trim() || tag);

  return (
    <>
      <div className="wb-filter" role="search">
        <div className="wb-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setFilter(() => setQuery(e.target.value))}
            placeholder="جست‌وجو در نوشته‌ها…"
            aria-label="جست‌وجو در نوشته‌ها"
          />
          {query && (
            <button
              type="button"
              className="wb-search__clear"
              onClick={() => setFilter(() => setQuery(""))}
              aria-label="پاک کردن جست‌وجو"
            >
              ✕
            </button>
          )}
        </div>

        {tags.length > 1 && (
          <div className="wb-chips" role="group" aria-label="فیلتر بر اساس برچسب">
            <button
              type="button"
              className={`wb-chip${tag === "" ? " is-active" : ""}`}
              onClick={() => setFilter(() => setTag(""))}
              aria-pressed={tag === ""}
            >
              همه
            </button>
            {tags.map((tg) => (
              <button
                key={tg}
                type="button"
                className={`wb-chip${tag === tg ? " is-active" : ""}`}
                onClick={() => setFilter(() => setTag(tag === tg ? "" : tg))}
                aria-pressed={tag === tg}
              >
                {tg}
              </button>
            ))}
          </div>
        )}

        {filtering && (
          <p className="wb-filter__count" role="status">
            {shown.length > 0
              ? `${faNum(shown.length)} نوشته پیدا شد`
              : "نوشته‌ای با این فیلتر پیدا نشد"}
          </p>
        )}
      </div>

      <main className="wb-list">
        {shown.map((post, i) => (
          <Link
            key={post.slug}
            className={`wb-card${interacted ? "" : " wb-reveal"}`}
            href={`/blog/${post.slug}`}
          >
            <div className="wb-card__media">
              <Image
                src={post.coverFallback}
                alt={post.coverAlt}
                fill
                sizes="(max-width: 640px) 100vw, 220px"
                // The first cover is the LCP element on this page; the rest stay
                // lazy so they do not compete for the same bandwidth.
                priority={i === 0}
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="wb-card__body" dir="rtl">
              <div className="wb-tags">
                {post.tags.slice(0, 3).map((t, j) => (
                  <span
                    key={t}
                    className={`wb-tag ${j === 0 ? "wb-tag--accent" : ""}`.trim()}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="wb-card__title">
                {post.emoji} {post.title}
              </h2>
              <p className="wb-card__excerpt">{post.excerpt}</p>
              <div className="wb-card__meta">
                <time dateTime={post.date}>{post.dateFa}</time>
                <span className="sep" />
                <span>{post.readingFa}</span>
                {typeof post.views === "number" && post.views > 0 && (
                  <>
                    <span className="sep" />
                    <span className="wb-views">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {faNum(post.views)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}

        {shown.length === 0 && (
          <div className="wb-noresult">
            <p>هیچ نوشته‌ای با این جست‌وجو پیدا نشد.</p>
            <button
              type="button"
              className="wb-chip"
              onClick={() =>
                setFilter(() => {
                  setQuery("");
                  setTag("");
                })
              }
            >
              نمایش همهٔ نوشته‌ها
            </button>
          </div>
        )}
      </main>
    </>
  );
}
