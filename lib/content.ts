// Blog content, read from the backend API.
//
// This used to hold SQL. It now holds HTTP calls and the static site copy —
// the data itself lives on the backend (see server/). Blog pages import from
// here exactly as before, so the render contract is untouched.
import { apiGet } from "./api";
import type { Post } from "./api-types";

export type { Block, Post } from "./api-types";

/** Cache tag purged whenever a post is created, edited or deleted. */
export const POSTS_TAG = "posts";

// Static site copy — pure presentation, no reason to round-trip for it.
export const site = {
  baseUrl: "https://farhad.bio",
  name: "Farhad Bigonahi",
  author: "Farhad Bigonahi",
  authorUrl: "https://farhad.bio/",
  authorImage: "/images/apple-touch-icon.png",
  locale: "fa_IR",
  // No `twitter` handle here on purpose — see twitterCreator() in lib/seo.ts.
  sectionHeading: "Latest Insights",
  sectionSubtitle: "Notes on building, AI and open-source tools.",
  viewAllLabel: "View all posts",
  // The <h1> carries the name, not the eyebrow above it. "آخرین مطالب" was a
  // label for a widget, not a page: it matched no query and wasted the single
  // strongest heading on the archive. The eyebrow now holds the topic line,
  // which is where the broad subject keywords belong.
  blogEyebrow: "برنامه‌نویسی · هوش مصنوعی · ابزارهای متن‌باز",
  blogTitle: "بلاگ فرهاد بیگناهی",
  // Shown under the blog <h1>. It used to read "ریلز ها", which described
  // nothing on the page and matched no query anyone would type.
  blogSubtitle: "یادداشت‌هایی درباره برنامه‌نویسی، هوش مصنوعی و ابزارهای متن‌باز",
  blogDescription: "یادداشت‌هایی درباره ساختن، هوش مصنوعی و ابزارهای متن‌باز.",
  navHome: "خانه",
  navBlog: "بلاگ",
  navContact: "تماس",
  contactEmail: "business@farhad.bio",
};

/**
 * Published posts, newest first.
 *
 * Throws if the backend is unreachable. That is deliberate: a thrown error
 * during ISR revalidation makes Next.js keep serving the last good page, which
 * is far better than replacing a working blog with an empty one. Callers that
 * genuinely cannot fail (sitemap, generateStaticParams) use getAllPostsSafe.
 */
export async function getAllPosts(): Promise<Post[]> {
  const { posts } = await apiGet<{ posts: Post[] }>("/v1/posts", {
    revalidate: 300,
    tags: [POSTS_TAG],
  });
  return posts;
}

export async function getPost(slug: string): Promise<Post | undefined> {
  try {
    const { post } = await apiGet<{ post: Post }>(
      `/v1/posts/${encodeURIComponent(slug)}`,
      { revalidate: 300, tags: [POSTS_TAG, `post:${slug}`] }
    );
    return post;
  } catch (err) {
    // A real 404 means "no such post" — anything else is an outage and must
    // propagate, so a downed backend never becomes a permanent 404.
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

/** Never throws. For build-time callers where an outage must not fail a deploy. */
export async function getAllPostsSafe(): Promise<Post[]> {
  try {
    return await getAllPosts();
  } catch (err) {
    console.error("[content] backend unreachable, continuing without posts:", err);
    return [];
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 404
  );
}
