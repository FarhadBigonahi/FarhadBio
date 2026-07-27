// Standalone migration runner: `npm run migrate`.
// The server also migrates on boot, but the deploy script runs this FIRST so a
// schema failure aborts the release before the old process is touched.
import { applyPragmas, closeDb, db } from "../db/client";
import { migrate } from "../db/migrate";

async function main() {
  db();
  await applyPragmas();
  const { applied, alreadyUpToDate } = await migrate((m) => console.log(m));
  console.log(
    alreadyUpToDate
      ? "schema already up to date"
      : `applied ${applied.length} migration(s): ${applied.join(", ")}`
  );
  await closeDb();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
