// Cache invalidation for post writes.
//
// Lives on the Vercel side because caching is a Vercel concern — the backend
// serves JSON and has no idea which pages render it. If the frontend ever moves
// somewhere else, this file is the only thing that changes.
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { POSTS_TAG } from "./content";

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
  revalidatePath(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/blog/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
}
