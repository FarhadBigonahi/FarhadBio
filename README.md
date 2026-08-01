# farhad.bio

Personal site of **Farhad Bigonahi** — a clean, component-based **Next.js 15** app (App Router, React 19, TypeScript, Tailwind v4).

Live: https://farhad.bio

## Stack

- **Next.js 15** (App Router, SSG)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **`motion`** for animations
- Self-hosted fonts via `next/font/local` — **Satoshi** (site) + **Iran Sans X** (Persian blog)

## Development

```bash
npm install      # first time only
npm run dev      # dev server on http://localhost:3001
npm run build    # production build
npm start        # serve the production build on :3001
```

## Structure

```
app/
  (site)/            English marketing site — root layout is <html lang="en" dir="ltr">
    page.tsx         Home
  (fa)/              Persian blog — root layout is <html lang="fa" dir="rtl">
    blog/            Blog index + [slug] post pages
  (admin)/           Dashboard — <html lang="fa" dir="rtl">, noindex
  api/               BFF route handlers
  fonts.ts           Shared next/font definitions (all three root layouts)
  robots.ts sitemap.ts manifest.ts feed.xml/   SEO + discovery routes
  globals.css        Global styles + theme tokens
components/          UI components (Hero, Intro, About, Skills, Certification, …)
lib/
  content.ts         Blog content (via the backend API) + static site copy
  seo.ts             Canonical URLs, shared metadata, JSON-LD builders
fonts/               Self-hosted woff2 (Satoshi, Iran Sans X)
public/images/       Static images
```

### Why three root layouts

`<html lang>` can only be set by a root layout, and the site is bilingual: the
marketing pages are English and LTR, the blog and dashboard are Persian and RTL.
Route groups give each section its own root layout so crawlers get the right
language for the right content. The trade-off is that navigating between the
English site and the Persian blog is a full page load rather than a client-side
transition — acceptable, since the two halves already load different stylesheets.

### SEO conventions

- Canonical URLs never carry a trailing slash (`/blog`, not `/blog/`) because
  that is the form the origin serves with `trailingSlash: false`. Build them
  with `absoluteUrl()` / `canonicalPath()` from `lib/seo.ts`, never by hand.
- Any page that declares `alternates` must go through the `alternates()` helper
  — Next replaces the whole object rather than merging, so a hand-written one
  silently drops the RSS feed link.

## Deployment

Hosted on **Vercel**, auto-deploying on push to `main`. Vercel detects Next.js
automatically (Framework Preset: **Next.js**) and runs `next build` — no custom
config required. Domains: `farhad.bio` + `www.farhad.bio`.
