// Adds tags to published posts, in place, over the admin API.
//
// Tags are the input to everything the blog does for Persian search: they build
// the /blog/tag archives, they seed each post's keyword expansion (lib/topics.ts)
// and they drive the related-posts links. The three live posts were written with
// four or five apiece, which is fewer topics than they actually cover.
//
//   node scripts/apply-tags.mjs                 # dry run — prints the diff only
//   node scripts/apply-tags.mjs --apply         # writes
//   API=http://localhost:3010 node scripts/apply-tags.mjs --apply   # against dev
//
// ADMIN_PASSWORD comes from the environment. The production one lives in
// ~/apps/farhadbio-api/shared/.env on the API box; /v1/auth/login allows ten
// attempts per fifteen minutes, so do not guess it.
//
// Safety: PUT /v1/admin/posts/:id replaces the whole row — normalizePost fills
// every field from the body it is given, so a partial write would blank the
// article. This reads each post first and sends it back whole with only `tags`
// changed. Existing tags are kept and only genuinely new ones appended.

const API = (process.env.API || "https://api.farhad.bio").replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");

/** Slug -> tags to add. Only phrases the post genuinely covers. */
const ADDITIONS = {
  "opus-5-free-clickup-ai": [
    "Gemini",
    "ابزار هوش مصنوعی",
    "ایمیل موقت",
    "چت هوش مصنوعی",
  ],
  "opus-5-free-tasklet-ai": [
    "ابزار هوش مصنوعی",
    "چت هوش مصنوعی",
    "کردیت رایگان",
  ],
  whisp: ["npm", "ابزار برنامه نویسی", "وایب کدینگ"],
};

/** Same folding as lib/topics.ts, so "هوش مصنوعي" is not appended twice. */
function normalize(s) {
  return s
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[‌‎‏]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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
  if (!res.ok) throw new Error(`login failed: ${body?.error?.message ?? res.status}`);
  const token = body.token ?? body.accessToken;
  if (!token) throw new Error(`login returned no token: ${JSON.stringify(body)}`);
  return token;
}

async function main() {
  const token = APPLY || process.env.ADMIN_PASSWORD ? await login() : null;
  const auth = token ? { authorization: `Bearer ${token}` } : {};

  // The admin list carries drafts too, and it is the only place ids are exposed.
  const listRes = await fetch(`${API}/v1/admin/posts`, { headers: auth });
  const { posts } = await json(listRes);
  if (!listRes.ok) throw new Error(`could not list posts (${listRes.status})`);

  for (const [slug, additions] of Object.entries(ADDITIONS)) {
    const summary = posts.find((p) => p.slug === slug);
    if (!summary) {
      console.log(`SKIP  ${slug} — no such post`);
      continue;
    }

    const detailRes = await fetch(`${API}/v1/admin/posts/${summary.id}`, { headers: auth });
    const { post } = await json(detailRes);
    if (!detailRes.ok) throw new Error(`could not read ${slug} (${detailRes.status})`);

    const have = new Set(post.tags.map(normalize));
    const fresh = additions.filter((t) => !have.has(normalize(t)));
    // The schema caps tags at 12 and silently drops the rest — truncate here so
    // what is printed is what is actually stored.
    const tags = [...post.tags, ...fresh].slice(0, 12);

    if (!fresh.length) {
      console.log(`OK    ${slug} — already has all of them`);
      continue;
    }
    console.log(`${APPLY ? "WRITE" : "DRY  "} ${slug}`);
    console.log(`        before: ${post.tags.join(", ")}`);
    console.log(`        after:  ${tags.join(", ")}`);

    if (!APPLY) continue;

    // The whole record goes back, with tags swapped. `views` is owned by the
    // read counter and is not part of the editor payload.
    const { id, views, ...rest } = post;
    const putRes = await fetch(`${API}/v1/admin/posts/${id}`, {
      method: "PUT",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ ...rest, tags }),
    });
    const result = await json(putRes);
    if (!putRes.ok) throw new Error(`write failed for ${slug}: ${JSON.stringify(result)}`);
    if (result.slug !== slug) {
      throw new Error(`slug changed for ${slug} -> ${result.slug}; investigate before continuing`);
    }
  }

  console.log(
    APPLY
      ? "\nDone. Redeploy or wait 60s for ISR to pick the new tags up."
      : "\nDry run — nothing written. Re-run with --apply."
  );
}

main().catch((err) => {
  console.error(String(err.message ?? err));
  process.exit(1);
});
