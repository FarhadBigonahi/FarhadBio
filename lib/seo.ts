// Every SEO signal the site emits — canonical URLs, shared metadata defaults
// and JSON-LD builders — lives here so the English site and the Persian blog
// can never drift apart on the details crawlers actually read.
import type { Metadata } from "next";
import type { Post } from "./content";
import { site } from "./content";

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

export const postPath = (slug: string) => `/blog/${slug}`;

/* ------------------------------------------------------------------ */
/* Shared metadata defaults                                            */
/* ------------------------------------------------------------------ */

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

/** The Blog node the Persian index and every article point back to. */
export function blogJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${site.baseUrl}/blog#blog`,
    url: absoluteUrl("/blog"),
    name: `${site.blogTitle} — ${identity.nameFa}`,
    description: DESCRIPTION_FA,
    inLanguage: "fa-IR",
    isPartOf: { "@id": SITE_ID },
    author: personNode("fa"),
    publisher: personNode("fa"),
  };
}

/** Ordered list of posts on the blog index — helps Google pick up the archive. */
export function blogListJsonLd(posts: Post[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl("/blog")}#posts`,
    name: site.blogTitle,
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
    dateModified: post.date,
    inLanguage: post.lang === "fa" ? "fa-IR" : post.lang,
    isPartOf: { "@id": `${site.baseUrl}/blog#blog` },
    author: personNode(post.lang === "fa" ? "fa" : "en"),
    publisher: personNode(post.lang === "fa" ? "fa" : "en"),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
    articleSection: post.tags[0] ?? undefined,
    wordCount: wordCount(post),
    timeRequired: `PT${Math.max(1, post.readingMinutes)}M`,
    isAccessibleForFree: true,
    // Read count as a first-class engagement signal. Omitted entirely at zero:
    // declaring "0 reads" on a new post is worse than declaring nothing.
    ...(post.views
      ? {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/ReadAction",
            userInteractionCount: post.views,
          },
        }
      : {}),
  };
}

/** Serialises a node for a <script type="application/ld+json"> tag. */
export function jsonLd(data: unknown): { __html: string } {
  // "<" is escaped so a stray sequence in post copy can never close the script.
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
