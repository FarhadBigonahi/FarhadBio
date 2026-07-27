// Process entry point: boot, then die cleanly.
//
// Order matters. Migrations run BEFORE the port opens, so a release that cannot
// migrate never receives a request — the deploy script's health check fails and
// it rolls back to the previous release automatically.
import { buildApp } from "./app";
import { config } from "./config";
import { applyPragmas, closeDb, db } from "./db/client";
import { migrate } from "./db/migrate";
import { pruneEvents } from "./modules/analytics/analytics.repo";

const DAY_MS = 86_400_000;

async function main(): Promise<void> {
  db();
  await applyPragmas();

  const { applied } = await migrate((msg) => console.log(`[migrate] ${msg}`));
  if (applied.length) console.log(`[migrate] applied ${applied.length}`);

  const app = await buildApp();

  // Retention runs in-process rather than as a host cron job: one less thing to
  // recreate when the service moves to a different machine.
  let prune: NodeJS.Timeout | undefined;
  if (config.eventRetentionDays > 0) {
    const run = () =>
      pruneEvents(config.eventRetentionDays)
        .then((n) => n && app.log.info({ removed: n }, "pruned old events"))
        .catch((err) => app.log.error({ err }, "event prune failed"));
    run();
    prune = setInterval(run, DAY_MS);
    prune.unref();
  }

  await app.listen({ host: config.host, port: config.port });
  app.log.info(
    { env: config.env, db: config.databaseUrl },
    `farhadbio-api listening on ${config.host}:${config.port}`
  );

  // pm2 reload sends SIGINT; systemd/docker send SIGTERM. Handle both so an
  // in-flight admin save is never cut mid-write.
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      app.log.info(`${signal} received — shutting down`);
      if (prune) clearInterval(prune);
      app
        .close()
        .then(closeDb)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  }
}

main().catch((err) => {
  // Config/migration failures land here. Exit non-zero so pm2 and the deploy
  // health check both see a hard failure instead of a silent zombie.
  console.error("[fatal]", err);
  process.exit(1);
});
