// The one and only database handle.
//
// libSQL speaks plain SQLite over a local file AND over a remote Turso URL with
// the exact same API, so moving the data off this box later is a config change
// (DATABASE_URL) rather than a rewrite. Everything above this file is written
// in portable SQL — no SQLite-only extensions, no vendor helpers.
import fs from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { config } from "../config";

let client: Client | null = null;

export function db(): Client {
  if (client) return client;

  // A local file DB needs its directory to exist before libsql opens it.
  if (config.databaseUrl.startsWith("file:")) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }

  client = createClient({
    url: config.databaseUrl,
    authToken: config.databaseAuthToken,
  });
  return client;
}

export async function closeDb(): Promise<void> {
  client?.close();
  client = null;
}

/** WAL keeps readers from blocking the writer — worth it even for one process. */
export async function applyPragmas(): Promise<void> {
  if (!config.databaseUrl.startsWith("file:")) return;
  const c = db();
  await c.execute("PRAGMA journal_mode = WAL");
  await c.execute("PRAGMA synchronous = NORMAL");
  await c.execute("PRAGMA foreign_keys = ON");
  await c.execute("PRAGMA busy_timeout = 5000");
}
