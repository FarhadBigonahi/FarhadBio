import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/content";

// One card in a post list.
//
// Shared by the blog index (client-side, filterable) and the tag archives
// (server-rendered, static) so the two can never drift into showing a post
// differently. No hooks, so it works unchanged in either environment.

export default function PostCard({
  post,
  priority = false,
  reveal = true,
}: {
  post: Post;
  /** Set on the first card of a list: its cover is that page's LCP element. */
  priority?: boolean;
  reveal?: boolean;
}) {
  return (
    <Link
      className={`wb-card${reveal ? " wb-reveal" : ""}`}
      href={`/blog/${post.slug}`}
    >
      <div className="wb-card__media">
        <Image
          src={post.coverFallback}
          alt={post.coverAlt}
          fill
          sizes="(max-width: 640px) 100vw, 220px"
          priority={priority}
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
      </div>
      <div className="wb-card__body" dir="rtl">
        {/* Not links: the whole card is already an anchor, and an <a> inside an
            <a> is invalid HTML. The crawlable topic links live in the archive's
            own topic list instead. */}
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
        </div>
      </div>
    </Link>
  );
}
