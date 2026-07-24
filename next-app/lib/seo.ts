import type { Post } from "./content";
import { site } from "./content";

const DESCRIPTION =
  "Farhad Bigonahi — full-stack developer and AI-driven builder. I design and ship clean, high-impact web products end to end, from database to interface.";

/** JSON-LD Person for the home page. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Farhad Bigonahi",
    url: "https://farhad.bio/",
    image: "https://farhad.bio/images/apple-touch-icon.png",
    jobTitle: "Full-Stack Developer & AI Builder",
    description: DESCRIPTION,
    sameAs: [
      "https://instagram.com/its.farhad.bio",
      "https://t.me/FBMASIH",
      "https://github.com/FarhadBigonahi",
    ],
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
      "AI",
    ],
  };
}

/** JSON-LD BlogPosting for an individual post. */
export function blogPostingJsonLd(post: Post) {
  const url = `${site.baseUrl}/blog/${post.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: `${post.emoji} ${post.title}`,
    description: post.metaDescription,
    image: `${site.baseUrl}${post.coverFallback}`,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: post.lang,
    author: { "@type": "Person", name: site.author, url: site.authorUrl },
    publisher: { "@type": "Person", name: site.author, url: site.authorUrl },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
  };
}
