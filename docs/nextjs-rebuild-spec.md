# FarhadBio — Next.js rebuild (pixel-faithful) — BUILD SPEC

## Goal & hard constraints (non-negotiable)
Rebuild the current site (a Framer static export) as a **clean, component-based, fast, SEO-strong Next.js 15 app** whose rendered result is **visually indistinguishable** from the current live site at desktop (1280) and mobile (390).

1. **EXACTLY the same** — no visible difference in layout, type, color, spacing, imagery, or copy.
2. Clean component architecture, fast (SSG/CDN), strong SEO.
3. **Do NOT push / deploy.** Build locally only. A human verifies parity before any push.
4. **Do NOT touch existing site files.** Build entirely inside `next-app/`. The current site (root `index.html`, `sites/`, `cms/`, `blog/`, `sections/`, `scripts/`) must stay intact and deployable.

Golden reference screenshots (current live site, captured this session, at repo root):
- `golden-desktop-1280.png` (full page, 1265×6774)
- `golden-mobile-390.png` (full page, 375×6566)
The live site is running at **http://localhost:8137** — introspect it directly for any exact value not in this spec.

## Stack
- Next.js 15 (App Router, React 19) + TypeScript
- Tailwind CSS v4 (tokens below as CSS variables / `@theme`)
- `motion` (Framer Motion) for scroll-reveal, hero, marquee, bar fills
- `next/font/local` for Satoshi + Iran Sans X; `next/image` for all raster images
- Deploy target: Vercel, statically generated (no `output: export` needed)

## Repo layout (build here only)
```
next-app/
  app/
    layout.tsx            # <html>, fonts, global metadata, JSON-LD
    globals.css           # Tailwind + tokens
    page.tsx              # home = compose sections
    blog/page.tsx         # blog index (SSG)
    blog/[slug]/page.tsx  # post (generateStaticParams → SSG)
    sitemap.ts, robots.ts
  components/
    Header.tsx Hero.tsx Intro.tsx About.tsx Skills.tsx
    Review.tsx Experience.tsx Certification.tsx Cta.tsx Footer.tsx
    Reveal.tsx            # scroll-reveal wrapper (IntersectionObserver/motion)
    Lightbox.tsx          # cert image lightbox
  lib/ (content.ts, seo.ts)
  content/blog/*          # migrated from ../blog/posts.json
  public/
    images/…  fonts/…     # COPIED from repo (see assets)
```

## Design tokens (exact)
Colors:
- `--bg` page base: `#080d17` (Framer sections)
- `--bg-fx` injected sections (Skills/Certs): `#131516`  ← keep distinct to match
- `--surface`: `#17191a`  · `--surface-deep`: `#0e0f10`
- `--text`: `#ffffff` · `--muted`: `#d7d7d7`
- accent: `--accent` `#0099ff` · `--accent-bright` `#39b0ff` · `--accent-light` `#4db8ff` · `--accent-dark` `#0077cc`
- skill fill gradient: `linear-gradient(90deg,#0077cc 0%,#0099ff 55%,#4db8ff 100%)`, glow `box-shadow:0 0 10px rgba(0,153,255,.32)`
- track bg: `rgba(255,255,255,.09)` · hairline border: `rgba(255,255,255,.14)`

Type (Satoshi; desktop px — scale down responsively with clamp, match golden):
- Hero wordmark "Farhad®": Satoshi 700, ~clamp(64px→display), letter-spacing -0.02em, lh ~1.15 (measure against golden; it's the largest text on the hero)
- Marquee "Get in touch.": Satoshi 700, 80px, ls -1.6px, lh 92px
- Section big text (Intro / "About" heading / stat numbers 8+ 100%): Satoshi 500, 36px, ls -1.044px (~-0.029em), lh 1.2
- Experience item title: Satoshi 700, 28px, ls -0.28px, lh 1.3
- Hero eyebrow "Code that drives impact.": Satoshi 500, 24px, ls -0.48px, lh 1.4
- Skills section title "Skills": 600, clamp(30→52px), ls -0.02em (from sections/skills-certs.css)
- Body/muted labels: 13–16px, `--muted`
Geometry: container max-width 1120px; section padding `clamp(64px,9vw,128px) 24px`; radii cards 18px / thumbs+badges+buttons 12px / pills 99px; easing `cubic-bezier(0.22,0.61,0.36,1)`.

## Fonts (self-host the SAME files)
Copy into `next-app/public/fonts/`:
- Satoshi 500 (normal): `third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2` → `Satoshi-Medium.woff2`
- Satoshi 700 (normal): `third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2` → `Satoshi-Bold.woff2`
- (optional Satoshi 900 for heaviest wordmark if golden shows heavier: `wf/NHPGVFYUXYXE33DZ75OIT4JFGHITX5PE/…/J64QX5IPOHK56I2KYUNBQ5M2XWZEYKYX.woff2`)
- Iran Sans X (blog RTL): copy all of `fonts/iransansx/*.woff2`
Load via `next/font/local`: family "Satoshi" (weights 500/700[/900]), family "IRANSansX". Satoshi is the site-wide UI/display font; Iran Sans X only for Persian blog content (`dir=rtl`).

## Assets (copy repo → next-app/public/images/)
- Logo: `images/logo.svg` (light) + `images/logo-white.svg` (dark). Header uses the white monogram.
- Hero image: `images/GfwTTKguFBeDrqBfGiEynuxsHMI.png` (man in water + skyline)
- About image: `images/BwTaIWn2N6Ts5RqZTfqDPBYYw.png`
- Review image (storefront/DIOR): `images/ydOiNMh5TzE424sVceqPUFGrR50.png`
- CTA image (neon corridor): `images/b9UGt2D4H6kmk5D4ahq8DNIM.png`
- Certificate: `images/certificate-aspnet.jpg` (1079×778)
- Favicons/OG: `images/apple-touch-icon.png`, existing og image `images/kATPE4tr4ORiZnqG9UALE75bfoc.png`
Use `next/image` (width/height from natural size; hero/about/review/cta `priority` only for hero). Keep aspect ratios exactly.

## Sections (exact copy + layout) — home page, in this order
1. **Header** (fixed/transparent over hero): white FB monogram (logo-white.svg) left. Nav center: `About · Expertise · Blogs · Contact`. Right CTA text link: `Start a Project`. Mobile: logo + blue hamburger → overlay menu. Targets: About→`#about`, Expertise→`#skills`, Blogs→`/blog`, Contact→`#contact`, Start a Project→`#contact`.
2. **Hero**: full-bleed hero image (desktop: cover, right-weighted; mobile: text on top + framed image below per golden-mobile). Overlay: eyebrow `Code that drives impact.`; giant wordmark `Farhad®`; right-aligned services list `Brand Identity / UI/UX Design / Web Development`. Subtle entrance/parallax motion.
3. **Intro** (`#080d17`, centered, large): `I build fast, reliable software end to end, from C# back-ends to React front-ends, and now with AI at the core.`
4. **About** (`id="about"`): heading `About`; image (`BwTaIWn2N6…`); paragraph (verbatim):
   > I'm Farhad Bigonahi, a full-stack developer who has been building software professionally since 2016. C# is my home turf, from the database all the way to the interface, with React and Node.js on the web and ASP.NET and NestJS behind the APIs. I've shipped production systems for teams like FlyToday, TopLearn, and Barnamenevisan, but from day one my real goal was to build my own products and turn my own ideas into businesses. When AI-first 'vibe coding' arrived, I went all in on it, and today I also teach it, finally passing on what I know after eight years in the craft.
   Stats row: **8+** / `Years Experience` — **100%** / `Perfectionist`.
5. **Skills** (`id="skills"`, `#131516`): title `Skills`, sub `Core stack & day-to-day tools`. 2-col grid (1-col ≤760px), animated fill bars. Items (name, %): C# 97 · ASP.NET Core 93 · Web API / REST 91 · SQL Server & EF Core 88 · JavaScript / TypeScript 86 · React & Next.js 83 · HTML & CSS 89 · Git & CI/CD 85. Bars fill on scroll (width transition 1.3s ease). Reuse styling from `sections/skills-certs.css`.
6. **Review** (testimonial): 5 gold stars; quote (verbatim):
   > "I don't ship anything I'm not proud of. I keep most of my time for my own products, so I take on very few outside projects, but the right one can always change my mind. Perfectionism isn't a phase for me; it's the standard."
   Attribution: `Farhad Bigonahi` / `Full-Stack Developer · AI Builder`. Right: image `ydOiNMh5TzE…`.
7. **Experience**: heading `Experience`. Rows (num / title / role / year), thin dividers:
   - 01 · promall.io · My Startup · Full-Stack · 2025
   - 02 · FlyToday · Full-Stack Developer · 2025
   - 03 · TopLearn · Web · API Developer · 2024
   - 04 · Barnamenevisan · Full-Stack Developer · 2024
8. **Certification** (`#131516`): title `Certification`, sub `Verified training credential`. Photo card: clickable framed thumb (`certificate-aspnet.jpg`, aspect 1079/778) → lightbox; badge icon; `ASP.NET Certification`; `Santa Monica Certification (SMC) · Dubai`; `Sep – Oct 2023 · 130 hours`; `View certificate` button → same lightbox. Reuse `sections/skills-certs.css` styling + `.fx-lightbox` behavior (Esc/backdrop close, focus trap, scroll lock).
9. **CTA** (`id="contact"`): full-width marquee repeating `Get in touch.` (Satoshi 700, 80px) scrolling horizontally, with the neon image (`b9UGt2D4H6…`) composited mid-marquee as in golden; `Contact Us` button below → `mailto:bigonahibit@gmail.com` (or `/contact`).
10. **Footer**: left links `Home · Blogs · Contact`; right social icons (Instagram, X, Telegram, Mail — match golden order); line `Farhad Bigonahi — Full-Stack Developer & AI Builder`; `© 2026 Farhad Bigonahi. All rights reserved.`; giant bottom wordmark `Farhad®`.

## Blog
Migrate from `../blog/posts.json` (single post today: slug `whisp`, Persian RTL). Prefer MDX under `content/blog/<slug>.mdx` with frontmatter (title, subtitle, excerpt, lang, dir, emoji, cover/coverFallback, date/dateFa/dateEn, readingMinutes, tags, repo, npm, metaTitle, metaDescription). Body blocks `p/h3/code/callout` → MDX + `<Callout>` and a syntax-highlighted `<Code>`. Persian posts render `dir="rtl" lang="fa"` with Iran Sans X. Match the current `/blog` visual style (`../blog/blog.css`) closely; index shows section heading `Latest Insights` / `Notes on building, AI and open-source tools.` and cards. Copy blog cover images (`images/blog/*`) to public.

## SEO / performance
- Per-page `metadata` (title, description, OpenGraph, Twitter) ported from current `index.html` head (title `Farhad Bigonahi — Full-Stack Developer & AI Builder`, the description, og:image `images/kATPE4tr4ORiZnqG9UALE75bfoc.png`, keywords, author, robots). Canonical `https://farhad.bio`.
- `app/sitemap.ts` + `app/robots.ts` (port existing `sitemap.xml` / `robots.txt`).
- JSON-LD: `Person` on home, `BlogPosting` on posts.
- `next/image` for all raster; `next/font` (no layout shift); target LCP < 2.0s, CLS ~0, Lighthouse ≥ 95.

## Verification protocol (agent does the build; human verifies parity)
1. `npm install` in `next-app/`, then `npm run dev` on **port 3001** (leave 8137 for the golden site). Confirm it builds and runs with **zero console errors**.
2. `npm run build` must succeed (all pages SSG).
3. Report: what was built, any deviations from golden you couldn't resolve, and how to run it. **Do NOT run git add/commit/push. Do NOT edit anything outside `next-app/`.**
4. A human will screenshot next-app at 1280/390, diff against the golden images, and iterate to zero visible difference before approving a push.

## Known fidelity risks to flag (don't hide)
Hero image treatment/parallax, CTA marquee timing, and scroll-reveal curves are Framer-runtime driven — reproduce as closely as possible with `motion`; note any that aren't byte-identical so the human can judge.
