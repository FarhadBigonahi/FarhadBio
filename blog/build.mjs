/* =====================================================================
   Whisp blog — static generator.
   Reads blog/posts.json and emits:
     - blog/index.html                (post listing)
     - blog/<slug>/index.html         (article, per post)
   and patches the homepage (index.html):
     - injects CSS/JS/font assets into <head>       (idempotent)
     - replaces the "Latest Insights" section        (idempotent, marker-guarded)

   A future dashboard only has to write posts.json and run:  node blog/build.mjs
   ===================================================================== */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => join(ROOT, ...a);

// ---- helpers --------------------------------------------------------
const esc = (s = "") => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const ARROW_L = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 6l-6 6 6 6M18 12H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_R = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 6l6 6-6 6M6 12h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const GITHUB = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>';
const NPM = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 5h20v14H12v-2h6V7H4v10h4V9h6v10H2V5Z"/></svg>';

function highlight(code) {
  return code.split("\n").map((line) => {
    let e = esc(line);
    e = e.replace(/^(\s*)([A-Za-z0-9_.\/-]+)/, (m, ws, w) => ws + '<span class="tok-cmd">' + w + "</span>");
    e = e.replace(/(\s)(--?[A-Za-z][\w-]*)/g, (m, s, f) => s + '<span class="tok-flag">' + f + "</span>");
    return e;
  }).join("\n");
}

function renderBlock(b) {
  switch (b.type) {
    case "lead":    return `<p class="wb-lead">${b.html}</p>`;
    case "p":       return `<p>${b.html}</p>`;
    case "h3":      return `<h3>${esc(b.text)}</h3>`;
    case "callout": return `<div class="wb-callout"><span>${b.html}</span></div>`;
    case "code":
      return `<div class="wb-code"><div class="wb-code__bar"><span class="wb-code__dots"><i></i><i></i><i></i></span>` +
             `<span class="wb-code__lang">${esc(b.lang || "bash")}</span>` +
             `<button class="wb-copy" type="button" aria-label="کپی کد">کپی</button></div>` +
             `<pre><code>${highlight(b.code)}</code></pre></div>`;
    default:        return "";
  }
}

const tagHtml = (t, i) => `<span class="wb-tag${i === 0 ? " wb-tag--accent" : ""}">${esc(t)}</span>`;

// ---- shared page chrome --------------------------------------------
function head(site, { title, description, url, image, imageAlt, post }) {
  const abs = (u) => (u && u.startsWith("http")) ? u : site.baseUrl + (u || "");
  const ld = post ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.emoji ? `${post.emoji} ${post.title}` : post.title,
    "description": post.metaDescription || post.excerpt,
    "image": abs(post.coverFallback || post.cover),
    "datePublished": post.date,
    "dateModified": post.date,
    "inLanguage": post.lang || "fa",
    "author": { "@type": "Person", "name": site.author, "url": site.authorUrl },
    "publisher": { "@type": "Person", "name": site.name, "url": site.authorUrl },
    "mainEntityOfPage": { "@type": "WebPage", "@id": abs(url) },
    "keywords": (post.tags || []).join(", ")
  }) : null;
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(site.author)}">
  <link rel="canonical" href="${esc(abs(url))}">
  <link rel="icon" href="/images/apple-touch-icon.png">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
  <meta property="og:type" content="${post ? "article" : "website"}">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:locale" content="${esc(site.locale)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(abs(url))}">
  <meta property="og:image" content="${esc(abs(image))}">
  <meta property="og:image:alt" content="${esc(imageAlt || title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(abs(image))}">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/iransansx/IRANSansX-Regular.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/iransansx/IRANSansX-Bold.woff2" crossorigin>
  <link rel="stylesheet" href="/blog/blog.css">
  <script>document.documentElement.classList.add('wb-js')</script>${ld ? `\n  <script type="application/ld+json">${ld}</script>` : ""}`;
}

const navBar = (site) => `  <nav class="wb-nav" dir="ltr" aria-label="Primary">
    <a class="wb-nav__brand" href="/"><img src="/images/apple-touch-icon.png" alt=""> ${esc(site.name)}</a>
    <div class="wb-nav__links">
      <a href="/">${esc(site.navHome)}</a>
      <a href="/blog/">${esc(site.navBlog)}</a>
      <a href="mailto:business@farhad.bio">${esc(site.navContact)}</a>
    </div>
    <div class="wb-nav__switch" role="group" aria-label="زبان">
      <a href="/" hreflang="en" title="English">EN</a>
      <span class="is-active" aria-current="true" lang="fa">FA</span>
    </div>
  </nav>`;

const footer = (site) => `  <footer class="wb-footer">
    © <span dir="ltr">2026 ${esc(site.name)}</span> — ساخته‌شده با ❤️ · <a href="/blog/">همه مطالب</a>
  </footer>`;

// ---- article page ---------------------------------------------------
function renderArticle(post, site) {
  const url = `/blog/${post.slug}/`;
  const bodyHtml = post.body.map(renderBlock).join("\n        ");
  const metaTitle = post.metaTitle || `${post.title} | ${site.name}`;
  return `<!doctype html>
<html lang="${post.lang || "fa"}" dir="${post.dir || "rtl"}">
<head>
${head(site, { title: metaTitle, description: post.metaDescription || post.excerpt, url, image: post.coverFallback || post.cover, imageAlt: post.coverAlt, post })}
</head>
<body class="wb-page">
${navBar(site)}
  <article class="wb-article">
    <header class="wb-hero">
      <div class="wb-hero__glow" aria-hidden="true"></div>
      <div class="wb-hero__inner wb-reveal">
        <div class="wb-hero__text">
          <a class="wb-back" href="/blog/">${ARROW_R}<span>بازگشت به بلاگ</span></a>
          <div class="wb-tags">${post.tags.map(tagHtml).join("")}</div>
          <h1 class="wb-hero__title">${post.emoji ? `<span class="wb-hero__emoji">${post.emoji}</span> ` : ""}${esc(post.title)}</h1>
          <p class="wb-hero__subtitle">${esc(post.subtitle || "")}</p>
          <div class="wb-hero__meta">
            <span class="wb-author"><img src="/images/apple-touch-icon.png" alt="${esc(site.author)}"> ${esc(site.author)}</span>
            <span class="sep"></span><time datetime="${esc(post.date)}">${esc(post.dateFa || post.dateEn)}</time>
            <span class="sep"></span><span>${esc(post.readingFa || "")}</span>
          </div>
        </div>
        <figure class="wb-hero__media">
          <picture>
            <source srcset="${esc(post.cover)}" type="image/webp">
            <img src="${esc(post.coverFallback || post.cover)}" width="${post.coverWidth}" height="${post.coverHeight}" alt="${esc(post.coverAlt)}">
          </picture>
        </figure>
      </div>
    </header>

    <div class="wb-wrap">
      <div class="wb-prose">
        ${bodyHtml}
        <div class="wb-actions">
          <a class="wb-btn wb-btn--primary" href="${esc(post.repo)}" target="_blank" rel="noopener">${GITHUB}<span>مشاهده در گیت‌هاب</span></a>
          <a class="wb-btn wb-btn--ghost" href="https://www.npmjs.com/package/${esc(post.npm)}" target="_blank" rel="noopener">${NPM}<span>پکیج npm</span></a>
        </div>
      </div>
    </div>
  </article>
${footer(site)}
  <script defer src="/blog/blog.js"></script>
</body>
</html>
`;
}

// ---- blog index page ------------------------------------------------
function renderCard(post) {
  return `      <a class="wb-card wb-reveal" href="/blog/${post.slug}/">
        <div class="wb-card__media"><picture><source srcset="${esc(post.cover)}" type="image/webp"><img src="${esc(post.coverFallback || post.cover)}" alt="${esc(post.coverAlt)}" loading="lazy"></picture></div>
        <div class="wb-card__body" dir="${post.dir || "rtl"}">
          <div class="wb-tags">${post.tags.slice(0, 3).map(tagHtml).join("")}</div>
          <h2 class="wb-card__title">${post.emoji ? post.emoji + " " : ""}${esc(post.title)}</h2>
          <p class="wb-card__excerpt">${esc(post.excerpt)}</p>
          <div class="wb-card__meta"><time datetime="${esc(post.date)}">${esc(post.dateFa || post.dateEn)}</time><span class="sep" style="width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.5"></span><span>${esc(post.readingFa || "")}</span></div>
        </div>
      </a>`;
}

function renderIndex(posts, site) {
  const url = "/blog/";
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
${head(site, { title: `بلاگ | ${site.name}`, description: "یادداشت‌هایی درباره ساختن، هوش مصنوعی و ابزارهای متن‌باز.", url, image: posts[0]?.coverFallback || "/images/apple-touch-icon.png", imageAlt: "Blog" })}
</head>
<body class="wb-page">
${navBar(site)}
  <header class="wb-index__head" dir="rtl">
    <p class="wb-eyebrow">${esc(site.blogEyebrow)}</p>
    <h1 class="wb-index__title">${esc(site.blogTitle)}</h1>
    <p class="wb-index__sub">${esc(site.blogSubtitle)}</p>
  </header>
  <main class="wb-list">
${posts.map(renderCard).join("\n")}
  </main>
${footer(site)}
  <script defer src="/blog/blog.js"></script>
</body>
</html>
`;
}

// ---- homepage featured section (lives in a <template>, injected by JS) --
// The original Framer "Blog" section is left intact for a clean hydration and
// hidden via CSS; blog.js clones this section into place AFTER hydration.
function renderFeatured(post, site) {
  return `<section class="wb-insights" data-wb-name="Blog" aria-label="${esc(site.sectionHeading)}">
  <div class="wb-container">
    <div class="wb-insights__head wb-reveal">
      <div>
        <p class="wb-eyebrow">Blog</p>
        <h2 class="wb-insights__title">${esc(site.sectionHeading)}</h2>
        <p class="wb-insights__sub">${esc(site.sectionSubtitle)}</p>
      </div>
      <a class="wb-viewall" href="/blog/">${esc(site.viewAllLabel)} ${ARROW_R}</a>
    </div>
    <a class="wb-featured wb-reveal" style="--wb-delay:120ms" href="/blog/${post.slug}/" aria-label="${esc(post.title)}">
      <div class="wb-featured__media">
        <span class="wb-featured__badge"><span class="wb-dot"></span>Open Source</span>
        <picture><source srcset="${esc(post.cover)}" type="image/webp"><img src="${esc(post.coverFallback || post.cover)}" width="${post.coverWidth}" height="${post.coverHeight}" alt="${esc(post.coverAlt)}" loading="lazy"></picture>
      </div>
      <div class="wb-featured__body" dir="${post.dir || "rtl"}">
        <div class="wb-tags">${post.tags.slice(0, 3).map(tagHtml).join("")}</div>
        <h3 class="wb-featured__title">${post.emoji ? post.emoji + " " : ""}${esc(post.title)}</h3>
        <p class="wb-featured__excerpt">${esc(post.excerpt)}</p>
        <div class="wb-featured__meta"><time datetime="${esc(post.date)}">${esc(post.dateFa || post.dateEn)}</time><span class="sep"></span><span>${esc(post.readingFa || "")}</span></div>
        <span class="wb-cta">خواندن مقاله ${ARROW_L}</span>
      </div>
    </a>
  </div>
</section>`;
}

const A0 = "<!--WBLOG:ASSETS:START-->", A1 = "<!--WBLOG:ASSETS:END-->";
const T0 = "<!--WBLOG:TEMPLATE:START-->", T1 = "<!--WBLOG:TEMPLATE:END-->";

function assetBlock() {
  return `${A0}
  <link rel="preload" as="font" type="font/woff2" href="/fonts/iransansx/IRANSansX-Regular.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/iransansx/IRANSansX-Bold.woff2" crossorigin>
  <link rel="stylesheet" href="/blog/blog.css">
  <script>document.documentElement.classList.add('wb-js')</script>
  <script defer src="/blog/blog.js"></script>
  <style>
    /* Blog section is intentionally removed from the homepage (the blog lives at
       /blog/, reachable via the "Blogs" nav link). Hide the original Framer section. */
    #main section[data-framer-name="Blog"]{display:none!important}
    /* Hero legibility: darken the rotating background so overlaid white text is
       readable on every slide, add a top scrim behind the nav, drop the corner
       image-slider control, and soften text for contrast. */
    #main section[data-framer-name="Hero"] [data-framer-name="Bg Image"]{filter:brightness(.5) saturate(1.05)!important}
    #main header[data-framer-name="Header"]{background:linear-gradient(180deg,rgba(6,10,20,.62),rgba(6,10,20,0))!important}
    #main section[data-framer-name="Hero"] .framer-text{text-shadow:0 1px 14px rgba(0,0,0,.5)}
    #main .framer-ke3y14-container{display:none!important}
  </style>
  ${A1}`;
}

function templateBlock(post, site) {
  return `${T0}
<template id="wb-featured-tpl">
${renderFeatured(post, site)}
</template>
${T1}`;
}

function replaceOrInsert(html, start, end, block, anchor) {
  if (html.includes(start)) {
    return html.replace(new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), block);
  }
  return html.replace(anchor, block + "\n" + anchor);
}

function patchHomepage(html, post, site) {
  html = replaceOrInsert(html, A0, A1, assetBlock(), "</head>");
  // Blog is intentionally NOT featured on the homepage — strip any previously
  // injected featured template so nothing renders there.
  const esc2 = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  html = html.replace(new RegExp("\\n?" + esc2(T0) + "[\\s\\S]*?" + esc2(T1)), "");
  return html;
}

// ---- sitemap --------------------------------------------------------
function renderSitemap(posts, site) {
  const latest = posts.map((p) => p.date).sort().slice(-1)[0] || posts[0]?.date;
  const u = (loc, lastmod, freq, prio) =>
    `  <url>\n    <loc>${site.baseUrl}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
  const rows = [
    u("/", latest, "monthly", "1.0"),
    u("/blog/", latest, "weekly", "0.8"),
    ...posts.map((p) => u(`/blog/${p.slug}/`, p.date, "monthly", "0.7")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

// ---- run ------------------------------------------------------------
const data = JSON.parse(await readFile(p("blog", "posts.json"), "utf8"));
const site = data.site;
const posts = data.posts;

for (const post of posts) {
  await mkdir(p("blog", post.slug), { recursive: true });
  await writeFile(p("blog", post.slug, "index.html"), renderArticle(post, site));
  console.log("  article  →", `blog/${post.slug}/index.html`);
}
await writeFile(p("blog", "index.html"), renderIndex(posts, site));
console.log("  listing  →", "blog/index.html");

let home = await readFile(p("index.html"), "utf8");
home = patchHomepage(home, posts[0], site);
await writeFile(p("index.html"), home);
console.log("  homepage → index.html  (section + assets patched)");

await writeFile(p("sitemap.xml"), renderSitemap(posts, site));
console.log("  sitemap  → sitemap.xml");
console.log("done:", posts.length, "post(s).");
