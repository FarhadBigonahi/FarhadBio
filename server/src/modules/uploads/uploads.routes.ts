// Image uploads for the blog admin.
//
// Deliberately dependency-free: the editor compresses the image in the browser
// and sends it as base64 JSON, so there is no multipart parser and no static-
// file plugin to install — a deploy is `git pull && build && pm2 restart`.
// Files land in DATA_DIR/uploads (the one directory that survives a release
// swap) and are served straight back from there under /v1/uploads/<name>.
import { createHash } from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { config } from "../../config";
import { HttpError } from "../../lib/http-error";
import { requireAdmin } from "../../plugins/require-admin";

const UPLOAD_DIR = path.join(config.dataDir, "uploads");

// ext → (mime, leading magic bytes). The claimed extension is verified against
// the real bytes so a renamed .exe can never be written or served as an image.
const KINDS: Record<string, { mime: string; magic: (b: Buffer) => boolean }> = {
  webp: { mime: "image/webp", magic: (b) => b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP" },
  jpg: { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: "image/png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
};

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB decoded — covers a full-res cover.

const uploadBody = z.object({
  // A data URL ("data:image/webp;base64,….") or bare base64 — both accepted.
  data: z.string().min(1),
  ext: z.enum(["webp", "jpg", "jpeg", "png"]).default("webp"),
});

const NAME_RE = /^[a-f0-9]{24}\.(webp|jpg|png)$/;

export async function uploadsRoutes(app: import("fastify").FastifyInstance) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // -------------------------------------------------------------- serve (public)
  // Content-addressed names are immutable, so cache them hard and forever.
  app.get<{ Params: { name: string } }>("/v1/uploads/:name", async (req, reply) => {
    const { name } = req.params;
    if (!NAME_RE.test(name)) throw new HttpError(404, "NOT_FOUND", "No such file.");
    const spec = KINDS[name.slice(name.lastIndexOf(".") + 1)];
    if (!spec) throw new HttpError(404, "NOT_FOUND", "No such file.");
    const file = path.join(UPLOAD_DIR, name);
    try {
      await fs.access(file);
    } catch {
      throw new HttpError(404, "NOT_FOUND", "No such file.");
    }
    return reply
      .header("content-type", spec.mime)
      .header("cache-control", "public, max-age=31536000, immutable")
      .send(createReadStream(file));
  });

  // --------------------------------------------------------------- upload (admin)
  app.register(async (admin) => {
    admin.addHook("preHandler", requireAdmin);

    admin.post(
      "/v1/admin/uploads",
      // Raise the body cap above the API's 1 MB default: base64 inflates ~33%.
      { bodyLimit: 9 * 1024 * 1024 },
      async (req, reply) => {
        const { data, ext } = uploadBody.parse(req.body);
        const kind = ext === "jpeg" ? "jpg" : ext;
        const spec = KINDS[kind];
        if (!spec) throw new HttpError(400, "BAD_IMAGE", "Unsupported image type.");

        const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
        const buf = Buffer.from(base64, "base64");
        if (buf.length === 0) throw new HttpError(400, "BAD_IMAGE", "Empty image.");
        if (buf.length > MAX_BYTES) throw new HttpError(413, "TOO_LARGE", "Image is too large.");
        if (!spec.magic(buf))
          throw new HttpError(400, "BAD_IMAGE", "File does not look like a real image.");

        // Content hash = dedupe + unguessable name + safe to cache immutably.
        const name = `${createHash("sha256").update(buf).digest("hex").slice(0, 24)}.${kind}`;
        await fs.writeFile(path.join(UPLOAD_DIR, name), buf);

        return reply.code(201).send({ url: `/v1/uploads/${name}`, bytes: buf.length });
      }
    );
  });
}
