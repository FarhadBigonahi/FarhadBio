import Link from "next/link";
import Image from "next/image";
import Reveal from "./Reveal";
import { getAllPostsSafe, site } from "@/lib/content";

// Latest blog posts on the English homepage.
//
// The homepage is the strongest page on the domain and it linked to no post at
// all — the only route in was the "Blogs" nav item, so every article sat two
// hops from the front door with no descriptive inbound link. This puts real
// anchor text (the post's own Persian title) on the highest-authority page.
//
// The titles are Persian because the blog is Persian; each is marked lang/dir
// so an English-page crawler reads them as Persian rather than as noise.

export default async function LatestPosts() {
  // Safe variant: the homepage must render even if the backend is down.
  const posts = (await getAllPostsSafe()).slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section className="insights" id="insights">
      <div className="container">
        <Reveal as="h2" className="insights__heading">
          {site.sectionHeading}
        </Reveal>
        <Reveal as="p" className="insights__sub" delay={60}>
          {site.sectionSubtitle}
        </Reveal>

        <div className="insights__grid">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={100 + i * 70}>
              <Link className="insight" href={`/blog/${post.slug}`}>
                <span className="insight__media">
                  <Image
                    src={post.coverFallback}
                    alt={post.coverAlt}
                    fill
                    sizes="(max-width: 760px) 100vw, 360px"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                </span>
                <span className="insight__body" lang={post.lang} dir={post.dir}>
                  <span className="insight__title">{post.title}</span>
                  <span className="insight__meta">
                    <time dateTime={post.date}>{post.dateFa}</time>
                    {" · "}
                    {post.readingFa}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <Link className="insights__all" href="/blog">
            {site.viewAllLabel}
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width={18} height={18}>
              <path
                d="M5 12h13M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
