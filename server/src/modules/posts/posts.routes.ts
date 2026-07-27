import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../../plugins/require-admin";
import { badRequest, conflict, notFound } from "../../lib/http-error";
import { normalizePost, postInputSchema } from "./posts.schema";
import * as repo from "./posts.repo";

const idParam = z.object({ id: z.coerce.number().int().positive() });
const slugParam = z.object({ slug: z.string().min(1).max(200) });

export async function postsRoutes(app: FastifyInstance): Promise<void> {
  // ---------------------------------------------------------------- public
  // Cache-Control is set for Cloudflare's benefit; Next.js does its own ISR on
  // top. `stale-while-revalidate` means a slow link to this box shows readers
  // the last good copy instead of a spinner.
  const publicCache = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" };

  app.get("/v1/posts", async (_req, reply) => {
    reply.headers(publicCache);
    return { posts: await repo.listPublished() };
  });

  app.get("/v1/posts/:slug", async (req, reply) => {
    const { slug } = slugParam.parse(req.params);
    const post = await repo.findBySlug(slug);
    if (!post) throw notFound(`No published post with slug "${slug}".`);
    reply.headers(publicCache);
    return { post };
  });

  // ----------------------------------------------------------------- admin
  app.register(async (admin) => {
    admin.addHook("preHandler", requireAdmin);

    admin.get("/v1/admin/posts", async () => ({ posts: await repo.listAll() }));

    admin.get("/v1/admin/posts/:id", async (req) => {
      const { id } = idParam.parse(req.params);
      const post = await repo.findById(id);
      if (!post) throw notFound();
      return { post };
    });

    admin.post("/v1/admin/posts", async (req, reply) => {
      const record = normalizePost(parseBody(req.body));
      if (await repo.slugTaken(record.slug)) {
        throw conflict(`Slug "${record.slug}" already exists.`, "SLUG_TAKEN");
      }
      const id = await repo.insert(record);
      reply.code(201);
      return { id, slug: record.slug };
    });

    admin.put("/v1/admin/posts/:id", async (req) => {
      const { id } = idParam.parse(req.params);
      const existing = await repo.findById(id);
      if (!existing) throw notFound();

      const record = normalizePost(parseBody(req.body));
      if (await repo.slugTaken(record.slug, id)) {
        throw conflict(
          `Slug "${record.slug}" is used by another post.`,
          "SLUG_TAKEN"
        );
      }
      await repo.update(id, record);
      // The old slug is returned so the caller can purge its cached URL too.
      return { id, slug: record.slug, previousSlug: existing.slug };
    });

    admin.delete("/v1/admin/posts/:id", async (req) => {
      const { id } = idParam.parse(req.params);
      const existing = await repo.findById(id);
      if (!existing) throw notFound();
      await repo.remove(id);
      return { ok: true, slug: existing.slug };
    });
  });
}

/** Turns zod's issue list into one human sentence for the editor's error banner. */
function parseBody(body: unknown) {
  const parsed = postInputSchema.safeParse(body);
  if (parsed.success) return parsed.data;
  const first = parsed.error.issues[0];
  const where = first?.path.join(".");
  throw badRequest(
    where ? `${where}: ${first?.message}` : (first?.message ?? "Invalid post."),
    "VALIDATION_FAILED"
  );
}
