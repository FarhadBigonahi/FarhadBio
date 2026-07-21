# Portrixe — self-hosted clone

An exact, standalone clone of **https://portrixe.framer.website/**, captured with a real
browser (Playwright) so every runtime-loaded module, image, font and CMS data file is included.
It runs fully offline — no calls to Framer's servers.

## Run it

```bash
node scripts/dev-server.mjs
# then open http://localhost:8137
```

Change the port with `PORT=3000 node scripts/dev-server.mjs`.

> It must be **served**, not opened as a `file://` page. This is a React / ES-module app
> (built by Framer), and browsers block ES modules + the CMS range-requests under `file://`.
> `scripts/dev-server.mjs` is a tiny zero-dependency static server that provides the two things Framer needs:
> correct MIME types for `.mjs`/`.woff2`, and HTTP **Range** support for the `.framercms` data files.

## What's inside

| Path | What it is |
|------|-----------|
| `index.html` | The page markup (server-rendered by Framer) + a small `URL` shim (see below) |
| `sites/70QK…/*.mjs` | 39 JS modules — Framer runtime, **Framer Motion** (animations), React, one per section |
| `images/` | 30 original-resolution images |
| `assets/`, `third-party-assets/fontshare/` | Inter + Fontshare fonts (all unicode subsets) |
| `cms/` | The `.framercms` data files driving Projects / Awards / Blog |
| `scripts/dev-server.mjs` | **Dev-only** static server (Range support + `/modules → /cms` alias). Not deployed — production is served statically by Vercel per `vercel.json`. |
| `_capture/` | Capture & verification scaffolding (manifest, download/rewrite/verify scripts, screenshots). Not needed to run. |

## How the clone was made faithful

1. **Captured the live app**, not the raw HTML — scrolling the real page triggered ~23 extra
   lazy-loaded modules/images that the initial HTML doesn't list.
2. **Mirrored every asset** from `framerusercontent.com`, preserving path structure.
3. **Domain-stripped** all absolute `https://framerusercontent.com/…` references → root-relative
   `/…`, so everything resolves against this server.
4. **`URL` shim** (inline in `index.html`): Framer's CMS loader calls `new URL(rel, "/modules/…")`,
   and `new URL()` requires an *absolute* base. The shim transparently prepends `location.origin`
   to root-relative bases — portable across any host/port, and it leaves the vendor bundles otherwise byte-faithful.
5. **Stripped** only Framer's editing/analytics infrastructure (the editor-bar bootstrap,
   `events.framer.com`, `framer.com/edit`) — none of it affects appearance or animation.

## Verification

Headless Chromium load at 1440×900 and 390×844: **0 console errors, 0 failed requests,
all images loaded**, all CMS-driven sections populated. Screenshots in `_capture/clone-desktop.png`
and `_capture/clone-mobile.png`.
