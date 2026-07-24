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
app/                 App Router pages, layout, metadata, sitemap & robots routes
  page.tsx           Home
  blog/              Blog index + [slug] post pages
  globals.css        Global styles + theme tokens
components/           UI components (Hero, Intro, About, Skills, Certification, …)
lib/                  Content (blog posts) + SEO helpers
fonts/               Self-hosted woff2 (Satoshi, Iran Sans X)
public/images/       Static images
```

## Deployment

Hosted on **Vercel**, auto-deploying on push to `main`. Vercel detects Next.js
automatically (Framework Preset: **Next.js**) and runs `next build` — no custom
config required. Domains: `farhad.bio` + `www.farhad.bio`.
