// Every SEO signal the site emits — canonical URLs, shared metadata defaults
// and JSON-LD builders — lives here so the English site and the Persian blog
// can never drift apart on the details crawlers actually read.
import type { Metadata } from "next";
import type { Post } from "./content";
import { site } from "./content";
import { postPath } from "./slugs";
import { postKeywords, tagPath } from "./topics";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const identity = {
  name: "Farhad Bigonahi",
  nameFa: "فرهاد بیگناهی",
  jobTitle: "Full-Stack Developer & AI Builder",
  jobTitleFa: "توسعه‌دهنده فول‌استک و سازنده محصولات مبتنی بر هوش مصنوعی",
  email: "business@farhad.bio",
  locality: "Dubai",
  country: "AE",
  sameAs: [
    "https://github.com/FarhadBigonahi",
    "https://instagram.com/its.farhad.bio",
    "https://t.me/FBMASIH",
  ],
} as const;

export const DESCRIPTION =
  "Farhad Bigonahi — full-stack developer and AI-driven builder. I design and ship clean, high-impact web products end to end, from database to interface.";

export const DESCRIPTION_FA =
  "فرهاد بیگناهی، توسعه‌دهنده فول‌استک با بیش از هشت سال تجربه در C#، ASP.NET Core، React و Next.js. یادداشت‌هایی درباره برنامه‌نویسی، هوش مصنوعی و ابزارهای متن‌باز.";

/* ------------------------------------------------------------------ */
/* Canonical URLs                                                      */
/* ------------------------------------------------------------------ */

/**
 * Canonical path for a route.
 *
 * The site is served with Next's default `trailingSlash: false`, so "/blog/"
 * answers 308 and "/blog" answers 200. Canonicals, sitemap entries and JSON-LD
 * @id values must all name the URL that actually returns 200 — pointing them at
 * a redirect wastes crawl budget and weakens the canonical signal. Only "/"
 * keeps its slash, because that is the form the origin serves.
 */
export function canonicalPath(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

/** Absolute canonical URL for a route. */
export function absoluteUrl(path: string): string {
  return `${site.baseUrl}${canonicalPath(path)}`;
}

// Defined in lib/slugs.ts so client bundles can import it without dragging
// `server-only` in through this file. Re-exported here because this is where
// every other canonical-URL helper lives.
export { postPath };

export { tagPath } from "./topics";

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

/**
 * When a post last changed, as an ISO-8601 string.
 *
 * `post.date` is the publication day and is never revised, so using it for both
 * `datePublished` and `dateModified` told every crawler that an article edited
 * this morning had not been touched since the day it went up. The backend now
 * reports the row's last save as `updatedAt`; this is the one place that decides
 * which of the two wins.
 *
 * The result is clamped to be no earlier than the publication date. A post can
 * be backdated in the editor, and a `dateModified` that precedes
 * `datePublished` is invalid structured data that Google discards outright —
 * taking the publication date back with it.
 */
export function modifiedDate(post: Post): string {
  const published = post.date;
  const updated = post.updatedAt;
  if (!updated) return published;

  const updatedMs = Date.parse(updated);
  const publishedMs = Date.parse(published);
  if (Number.isNaN(updatedMs)) return published;
  // NaN here means the publication date is unparseable, in which case there is
  // nothing to clamp against and the save time is the better of the two.
  if (!Number.isNaN(publishedMs) && updatedMs < publishedMs) return published;
  return updated;
}

/* ------------------------------------------------------------------ */
/* Shared metadata defaults                                            */
/* ------------------------------------------------------------------ */

/**
 * Search-console ownership tokens, read from the environment.
 *
 * These are the meta tags Google and Bing look for when you claim a property.
 * They live in env rather than in source because they are per-property strings
 * that mean nothing to anyone forking this repo, and because a token can be
 * rotated without a code change. Nothing is emitted for a variable that is
 * unset, so the tags never appear as empty attributes.
 */
function verification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

/**
 * The metadata every root layout shares: resolution base, icons and the feed
 * discovery link. Each root layout owns its own language-specific title,
 * description and Open Graph locale on top of this.
 */
export const sharedMetadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  creator: identity.name,
  publisher: identity.name,
  authors: [{ name: identity.name, url: `${site.baseUrl}/` }],
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      {
        url: "/images/logo.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/logo-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/images/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: alternates(),
  verification: verification(),
};

/**
 * Canonical + feed discovery for a page.
 *
 * Next.js replaces the whole `alternates` object when a page declares one
 * rather than deep-merging it, so any page that sets a canonical must restate
 * the feed link or silently lose it. Going through this helper makes that
 * impossible to forget.
 *
 * Omit `path` in a layout. A canonical inherited by a whole subtree is a
 * footgun: any page under it that forgets to set its own would quietly declare
 * itself a duplicate of the layout's URL.
 */
export function alternates(path?: string): NonNullable<Metadata["alternates"]> {
  return {
    ...(path ? { canonical: canonicalPath(path) } : {}),
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: `${site.name} — بلاگ` },
      ],
    },
  };
}

/**
 * The `twitter:creator` fragment, or nothing at all.
 *
 * This used to be "@its.farhad.bio", which is an Instagram handle. An X
 * username is letters, digits and underscores only and caps at 15 characters,
 * so that tag named an account that cannot exist — every card on the site was
 * attributed to nobody, on all four page types. There is no X account today; if
 * one ever exists, putting it here is the only change needed.
 */
const TWITTER_CREATOR = "";

export function twitterCreator(): { creator?: string } {
  return TWITTER_CREATOR ? { creator: TWITTER_CREATOR } : {};
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

const PERSON_ID = `${site.baseUrl}/#person`;
const SITE_ID = `${site.baseUrl}/#website`;

/**
 * A self-contained author node.
 *
 * Blog pages used to reference the author as a bare `{"@id": ".../#person"}`.
 * That is only valid if the full Person node is in the *same* document — search
 * engines do not follow an @id to a node defined on another page — so on every
 * article the author resolved to nothing. This carries the name inline while
 * keeping the shared @id, so the entity still merges with the homepage's Person
 * instead of becoming a second, lookalike author.
 *
 * On Persian pages the primary name is the Persian spelling, with the Latin one
 * as alternateName — that is the pairing that matches a Persian-script query.
 */
function personNode(lang: "fa" | "en" = "en") {
  const fa = lang === "fa";
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: fa ? identity.nameFa : identity.name,
    alternateName: fa ? identity.name : identity.nameFa,
    url: `${site.baseUrl}/`,
    jobTitle: fa ? identity.jobTitleFa : identity.jobTitle,
    sameAs: [...identity.sameAs],
  };
}

/**
 * The Person node, referenced by @id from every other node so search engines
 * resolve one entity across the English site and the Persian blog rather than
 * two lookalike authors.
 */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: identity.name,
    // The Persian spelling is how Iranian users actually search for him; without
    // it the entity never matches a Persian-script query.
    alternateName: [identity.nameFa, "Farhad Bigonahi Masih"],
    url: `${site.baseUrl}/`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.baseUrl}/` },
    image: {
      "@type": "ImageObject",
      url: `${site.baseUrl}/images/apple-touch-icon.png`,
      width: 180,
      height: 180,
    },
    jobTitle: identity.jobTitle,
    description: DESCRIPTION,
    email: `mailto:${identity.email}`,
    knowsLanguage: [
      { "@type": "Language", name: "Persian", alternateName: "fa" },
      { "@type": "Language", name: "English", alternateName: "en" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: identity.locality,
      addressCountry: identity.country,
    },
    sameAs: [...identity.sameAs],
    knowsAbout: [
      "C#",
      "ASP.NET Core",
      "Web API",
      "SQL Server",
      "Entity Framework Core",
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "NestJS",
      "Artificial Intelligence",
      "AI-assisted development",
    ],
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: "ASP.NET Certification",
      credentialCategory: "certificate",
      recognizedBy: {
        "@type": "Organization",
        name: "Santa Monica Certification (SMC)",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dubai",
          addressCountry: "AE",
        },
      },
    },
  };
}

/** WebSite node — feeds the site-name treatment and sitelinks in the SERP. */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${site.baseUrl}/`,
    name: identity.name,
    alternateName: [identity.nameFa, "farhad.bio"],
    description: DESCRIPTION,
    inLanguage: ["en", "fa-IR"],
    publisher: { "@id": PERSON_ID },
  };
}

/**
 * ProfilePage for the homepage.
 *
 * The homepage emitted a Person and a WebSite but nothing that described the
 * *page* — so the two nodes floated with no document to anchor them, and the
 * one URL on the site that is literally a personal profile was not typed as
 * one. ProfilePage is the type Google documents for exactly this, and it is
 * what lets the Person be understood as the subject of the page rather than as
 * something merely mentioned on it.
 *
 * `mainEntity` references the Person by @id, which is valid here because the
 * full Person node ships in the same <script> block (see app/(site)/page.tsx).
 */
export function profilePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${site.baseUrl}/#webpage`,
    url: `${site.baseUrl}/`,
    name: `${identity.name} — ${identity.jobTitle}`,
    description: DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": SITE_ID },
    about: { "@id": PERSON_ID },
    mainEntity: { "@id": PERSON_ID },
    // The blog is the site's other half and its only regularly-updated surface.
    // Naming it here gives the profile an explicit, typed edge to the archive.
    hasPart: { "@id": `${site.baseUrl}/blog#blog` },
  };
}

/** The Blog node the Persian index and every article point back to. */
export function blogJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${site.baseUrl}/blog#blog`,
    url: absoluteUrl("/blog"),
    // blogTitle already names him; appending identity.nameFa would repeat it.
    name: site.blogTitle,
    description: DESCRIPTION_FA,
    inLanguage: "fa-IR",
    isPartOf: { "@id": SITE_ID },
    author: personNode("fa"),
    publisher: personNode("fa"),
  };
}

/** Ordered list of posts on the blog index — helps Google pick up the archive. */
export function blogListJsonLd(posts: Post[]) {
  return postListJsonLd(posts, absoluteUrl("/blog"), site.blogTitle);
}

/** The same ItemList shape, reused by the tag archives. */
export function postListJsonLd(posts: Post[], pageUrl: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#posts`,
    name,
    numberOfItems: posts.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: posts.map((post, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(postPath(post.slug)),
      name: post.title,
    })),
  };
}

/**
 * CollectionPage for a tag archive.
 *
 * `about` names the topic as an entity rather than leaving it as a string in
 * `keywords`, which is what lets the archive be understood as "the page about
 * هوش مصنوعی" instead of a page that happens to contain the words.
 */
export function tagCollectionJsonLd(tag: string, posts: Post[]) {
  const url = absoluteUrl(tagPath(tag));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: tagTitle(tag),
    description: tagDescription(tag, posts.length),
    inLanguage: "fa-IR",
    isPartOf: { "@id": `${site.baseUrl}/blog#blog` },
    about: topicNode(tag),
    author: personNode("fa"),
    publisher: personNode("fa"),
    mainEntity: { "@id": `${url}#posts` },
  };
}

/** A topic as a schema.org Thing, so tags read as entities and not as strings. */
function topicNode(tag: string) {
  return { "@type": "Thing", name: tag };
}

/** Shared between the tag page's <title>, its OG title and its JSON-LD name. */
export function tagTitle(tag: string): string {
  return `${tag} — نوشته‌های ${identity.nameFa}`;
}

export function tagDescription(tag: string, count: number): string {
  return `همهٔ نوشته‌های ${identity.nameFa} دربارهٔ ${tag}${
    count ? ` — ${count} مطلب` : ""
  }. یادداشت‌هایی درباره برنامه‌نویسی، هوش مصنوعی و ابزارهای متن‌باز.`;
}

/** Breadcrumbs. Persian labels, because every crumb here sits on an RTL page. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * The <title> for a post, guaranteed to carry the author's name once.
 *
 * metaTitle is hand-typed in the admin, so whether it ends with "| فرهاد
 * بیگناهی" is down to whoever wrote the post. Appending unconditionally would
 * double it on the posts that already have it; using the layout's title
 * template would drop it on the ones that do not. This settles it either way.
 */
export function postTitle(post: Post): string {
  const name = post.lang === "fa" ? identity.nameFa : identity.name;
  return post.metaTitle.includes(name)
    ? post.metaTitle
    : `${post.metaTitle} | ${name}`;
}

/** Rough word count for a post, used for BlogPosting.wordCount. */
function wordCount(post: Post): number {
  const text = post.body
    .map((b) => {
      switch (b.type) {
        case "p":
        case "callout":
        case "quote":
          return b.html.replace(/<[^>]+>/g, " ");
        case "h3":
          return b.text;
        case "list":
          return b.items.join(" ");
        case "image":
          return b.caption;
        // Code is prose to a compiler, not to a reader — counting it would
        // inflate the number search engines use to judge article depth.
        case "code":
          return "";
      }
    })
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** JSON-LD BlogPosting for an individual post. */
export function blogPostingJsonLd(post: Post) {
  const url = absoluteUrl(postPath(post.slug));
  const image = /^https?:\/\//.test(post.coverFallback)
    ? post.coverFallback
    : `${site.baseUrl}${post.coverFallback}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    // The emoji is decoration in the page heading; it does not belong in the
    // headline a search engine renders.
    headline: post.title,
    alternativeHeadline: post.subtitle,
    description: post.metaDescription,
    url,
    image: {
      "@type": "ImageObject",
      url: image,
      width: post.coverWidth,
      height: post.coverHeight,
    },
    datePublished: post.date,
    dateModified: modifiedDate(post),
    inLanguage: post.lang === "fa" ? "fa-IR" : post.lang,
    isPartOf: { "@id": `${site.baseUrl}/blog#blog` },
    author: personNode(post.lang === "fa" ? "fa" : "en"),
    publisher: personNode(post.lang === "fa" ? "fa" : "en"),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // The author's tags plus the phrases people actually search for them by —
    // five hand-typed labels were never going to match a real Persian query.
    keywords: postKeywords(post).join(", "),
    about: post.tags.map(topicNode),
    articleSection: post.tags[0] ?? undefined,
    wordCount: wordCount(post),
    timeRequired: `PT${Math.max(1, post.readingMinutes)}M`,
    isAccessibleForFree: true,
    // No interactionStatistic: read counts are author-facing only, and putting
    // them in JSON-LD would publish the very number the page hides.
  };
}

/** Serialises a node for a <script type="application/ld+json"> tag. */
export function jsonLd(data: unknown): { __html: string } {
  // "<" is escaped so a stray sequence in post copy can never close the script.
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
