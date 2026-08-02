// Renames published posts to their Persian slugs, over the admin API.
//
// Post URLs are now the article's own Persian title, so the words a reader
// searched appear in the URL line of the Google result. The three posts written
// before that decision live at hand-typed ASCII slugs; this moves them.
//
//   node scripts/rename-slugs.mjs                 # dry run — prints the moves
//   node scripts/rename-slugs.mjs --apply         # writes
//   API=http://localhost:3010 node scripts/rename-slugs.mjs --apply   # dev
//
// ADMIN_PASSWORD comes from the environment. The production one lives in
// ~/apps/farhadbio-api/shared/.env on the API box; /v1/auth/login allows ten
// attempts per fifteen minutes, so do not guess it.
//
// Run this ONCE, and only after the frontend carrying lib/slugs.ts is deployed.
// In that order the old URL answers a 301 the moment the row changes; in the
// other order it answers a 404 for as long as the deploy takes.
//
// Safety: PUT /v1/admin/posts/:id replaces the whole row — normalizePost fills
// every field from the body it is given, so a partial write would blank the
// article. This reads each post first and sends it back whole with only `slug`
// changed. It is idempotent: a post already at its new slug is skipped.

const API = (process.env.API || "https://api.farhad.bio").replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");

/**
 * Old slug -> new slug.
 *
 * These are the exact strings in RETIRED in lib/slugs.ts, and the two lists have
 * to agree: this script moves the row, that map serves the 301. A slug here that
 * is missing there is a 404 on a URL Google has already indexed.
 *
 * Each value is its post's title run through the site's slugifier, with one
 * deliberate exception: the whisp post's title does not contain the tool's name,
 * and "whisp" is the query the post is most likely to be found by, so the slug
 * leads with it.
 */
const RENAMES = {
  "opus-5-free-clickup-ai":
    "opus-5-رایگان-بهترین-مدل-های-هوش-مصنوعی-دنیا-را-در-clickup-استفاده-کن",
  "opus-5-free-tasklet-ai":
    "opus-5-رایگان-بهترین-مدل-های-هوش-مصنوعی-دنیا-را-در-tasklet-استفاده-کن",
  whisp: "whisp-هوش-مصنوعی-به-حرفت-گوش-نمی-کنه",
};

/** The backend's own cap. A longer slug would come back silently truncated. */
const MAX_SLUG = 80;

async function json(res) {
  const body = await res.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${res.status} — non-JSON response: ${body.slice(0, 200)}`);
  }
}

async function login() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set.");
  const res = await fetch(`${API}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await json(res);
  if (!res.ok)
    throw new Error(`login failed: ${body?.error?.message ?? res.status}`);
  const token = body.token ?? body.accessToken;
  if (!token) throw new Error(`login returned no token: ${JSON.stringify(body)}`);
  return token;
}

async function main() {
  // Refuse to write anything if a slug in the table cannot survive the round
  // trip — better to fix the table than to discover a truncated URL in Search
  // Console three weeks from now.
  for (const [from, to] of Object.entries(RENAMES)) {
    if (to.length > MAX_SLUG) {
      throw new Error(
        `"${from}" -> new slug is ${to.length} chars, over the ${MAX_SLUG} cap.`
      );
    }
  }

  const token = APPLY || process.env.ADMIN_PASSWORD ? await login() : null;
  const auth = token ? { authorization: `Bearer ${token}` } : {};

  // The admin list carries drafts too, and it is the only place ids are exposed.
  const listRes = await fetch(`${API}/v1/admin/posts`, { headers: auth });
  const { posts } = await json(listRes);
  if (!listRes.ok) throw new Error(`could not list posts (${listRes.status})`);

  for (const [from, to] of Object.entries(RENAMES)) {
    const summary = posts.find((p) => p.slug === from);
    if (!summary) {
      const already = posts.find((p) => p.slug === to);
      console.log(
        already
          ? `OK    ${from} — already renamed`
          : `SKIP  ${from} — no such post`
      );
      continue;
    }

    const detailRes = await fetch(`${API}/v1/admin/posts/${summary.id}`, {
      headers: auth,
    });
    const { post } = await json(detailRes);
    if (!detailRes.ok)
      throw new Error(`could not read ${from} (${detailRes.status})`);

    console.log(`${APPLY ? "WRITE" : "DRY  "} ${post.title}`);
    console.log(`        from: /blog/${from}`);
    console.log(`        to:   /blog/${to}`);
    console.log(`        link: ${API.replace("api.", "")}/blog/${encodeURIComponent(to)}`);

    if (!APPLY) continue;

    // The whole record goes back, with the slug swapped. `views` is owned by the
    // read counter and is not part of the editor payload.
    const { id, views, ...rest } = post;
    const putRes = await fetch(`${API}/v1/admin/posts/${id}`, {
      method: "PUT",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ ...rest, slug: to }),
    });
    const result = await json(putRes);
    if (!putRes.ok)
      throw new Error(`write failed for ${from}: ${JSON.stringify(result)}`);
    // The backend re-slugifies whatever it is given, so the stored slug is the
    // only authority on where the post now lives. If it differs from the table,
    // the 301 in lib/slugs.ts points at a URL that does not exist — stop.
    if (result.slug !== to) {
      throw new Error(
        `backend stored "${result.slug}", not "${to}". ` +
          `Fix RETIRED in lib/slugs.ts to match before continuing.`
      );
    }
  }

  console.log(
    APPLY
      ? "\nDone. The /v1/posts response is cached for 5 minutes — wait that out\n" +
          "or redeploy the frontend, then resubmit the sitemap in Search Console."
      : "\nDry run — nothing written. Re-run with --apply."
  );
}

main().catch((err) => {
  console.error(String(err.message ?? err));
  process.exit(1);
});
