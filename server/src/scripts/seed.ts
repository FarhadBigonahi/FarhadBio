// Idempotent content seed: `npm run seed`.
//
// Only inserts a post when its slug is missing, so it is safe to run on every
// deploy and safe to run against a live database. It never updates or deletes —
// once a post exists, the dashboard owns it.
import { closeDb, db } from "../db/client";
import { migrate } from "../db/migrate";
import * as repo from "../modules/posts/posts.repo";
import { normalizePost, postInputSchema } from "../modules/posts/posts.schema";
import { seedPosts } from "./seed-data";

async function main() {
  db();
  await migrate();

  let inserted = 0;
  for (const raw of seedPosts) {
    const parsed = postInputSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[seed] skipping invalid post:`, parsed.error.issues[0]);
      continue;
    }
    const record = normalizePost(parsed.data);
    if (await repo.slugTaken(record.slug)) {
      console.log(`[seed] exists, skipping — ${record.slug}`);
      continue;
    }
    await repo.insert(record);
    inserted++;
    console.log(`[seed] inserted — ${record.slug}`);
  }

  console.log(`[seed] done (${inserted} inserted)`);
  await closeDb();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
