import type { Metadata } from "next";
import { getAllPosts, site } from "@/lib/content";
import { BlogNav, BlogFooter } from "@/components/BlogChrome";
import BlogEnhancements from "@/components/BlogEnhancements";
import BlogList from "@/components/BlogList";
import { faNum } from "@/lib/fa";
import {
  DESCRIPTION_FA,
  absoluteUrl,
  alternates,
  blogJsonLd,
  blogListJsonLd,
  breadcrumbJsonLd,
  identity,
  jsonLd,
} from "@/lib/seo";

const OG_IMAGE = `${site.baseUrl}/images/blog/whisp-ai-whip-cover.png`;
const TITLE = `بلاگ ${identity.nameFa} — برنامه‌نویسی و هوش مصنوعی`;

export const metadata: Metadata = {
  // Absolute, so the layout's "%s | فرهاد بیگناهی" template does not repeat the
  // name that is already in the title.
  title: { absolute: TITLE },
  description: DESCRIPTION_FA,
  keywords: [
    "بلاگ برنامه نویسی",
    "فرهاد بیگناهی",
    "هوش مصنوعی",
    "ابزارهای متن‌باز",
    "وایب کدینگ",
    "آموزش برنامه نویسی",
    "سی شارپ",
    "ASP.NET Core",
    "React",
    "Next.js",
    "Farhad Bigonahi blog",
  ],
  alternates: alternates("/blog"),
  openGraph: {
    type: "website",
    siteName: identity.nameFa,
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    title: TITLE,
    description: DESCRIPTION_FA,
    url: absoluteUrl("/blog"),
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION_FA,
    creator: site.twitter,
    images: [OG_IMAGE],
  },
};

// Statically cached, but revalidated so new posts appear without a redeploy.
export const revalidate = 60;

export default async function BlogIndex() {
  const posts = await getAllPosts();
  const totalReads = posts.reduce((sum, p) => sum + (p.views ?? 0), 0);

  return (
    <div className="wb-page wb-js" lang="fa" dir="rtl">
      <BlogNav />

      <header className="wb-index__head" dir="rtl">
        <p className="wb-eyebrow">{site.blogEyebrow}</p>
        <h1 className="wb-index__title">{site.blogTitle}</h1>
        <p className="wb-index__sub">{site.blogSubtitle}</p>
        <p className="wb-index__stats">
          <span>{faNum(posts.length)} نوشته</span>
          {totalReads > 0 && (
            <>
              <span className="sep" />
              <span>{faNum(totalReads)} بازدید</span>
            </>
          )}
        </p>
      </header>

      <BlogList posts={posts} />

      <BlogFooter />
      <BlogEnhancements />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          blogJsonLd(),
          blogListJsonLd(posts),
          breadcrumbJsonLd([
            { name: site.navHome, path: "/" },
            { name: site.navBlog, path: "/blog" },
          ]),
        ])}
      />
    </div>
  );
}
