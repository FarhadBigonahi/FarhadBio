// Cache invalidation for post writes.
//
// Lives on the Vercel side because caching is a Vercel concern — the backend
// serves JSON and has no idea which pages render it. If the frontend ever moves
// somewhere else, this file is the only thing that changes.
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { POSTS_TAG } from "./content";
import { postPath } from "./slugs";

/**
 * Purges the rendered page for one slug.
 *
 * Both spellings of the path go in. Post slugs are Persian, and a cache entry
 * is keyed by the pathname as it arrived — which is percent-encoded for a real
 * request but decoded for anything that built the path from the slug itself.
 * Purging one form and not the other leaves a stale article on the URL readers
 * actually visit, which is the exact failure this function exists to prevent.
 */
function purgePost(slug: string): void {
  revalidatePath(postPath(slug));
  const decoded = `/blog/${slug}`;
  if (decoded !== postPath(slug)) revalidatePath(decoded);
}

/**
 * Purges every surface a post appears on. `previousSlug` matters on a rename:
 * without it the old URL keeps serving a stale page until its TTL expires.
 */
export function purgePostCaches(slug: string, previousSlug?: string): void {
  // Tag purge covers the fetch cache (the /v1/posts responses themselves).
  revalidateTag(POSTS_TAG);

  // Path purges cover the rendered pages.
  revalidatePath("/");
  revalidatePath("/blog");
  purgePost(slug);
  if (previousSlug && previousSlug !== slug) purgePost(previousSlug);
  revalidatePath("/sitemap.xml");
}
