// Single source of truth for every environment-dependent value.
//
// Why one file: it is the complete list of things that change when the service
// moves to a different machine. Nothing else in src/ reads process.env, so
// "what do I need to provision?" is answered by reading this file alone.
//
// Boot fails loudly on a bad/missing value rather than half-starting — a
// misconfigured server that answers requests is worse than one that refuses to.
import path from "node:path";
import { z } from "zod";

const bool = (d: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? d : v === "true" || v === "1"));

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3010),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().default("file:farhadbio.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  DATA_DIR: z.string().default("./data"),

  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 chars"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  CORS_ORIGINS: csv,
  TRUST_PROXY: bool(true),

  // 0 = keep analytics events forever. Anything higher deletes rows older than
  // N days once a day, which is both a privacy stance and a disk-growth guard.
  EVENT_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(0),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`
    );
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  const env = parsed.data;

  // A relative "file:" DB path is resolved against DATA_DIR, never the cwd.
  // Deploys swap the cwd (releases/<sha>) but DATA_DIR is shared and stable.
  const dataDir = path.resolve(env.DATA_DIR);
  const databaseUrl = resolveDbUrl(env.DATABASE_URL, dataDir);

  return {
    env: env.NODE_ENV,
    isProd: env.NODE_ENV === "production",
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    dataDir,
    databaseUrl,
    databaseAuthToken: env.DATABASE_AUTH_TOKEN || undefined,
    adminPassword: env.ADMIN_PASSWORD,
    authSecret: env.AUTH_SECRET,
    sessionDays: env.SESSION_DAYS,
    corsOrigins: env.CORS_ORIGINS,
    trustProxy: env.TRUST_PROXY,
    eventRetentionDays: env.EVENT_RETENTION_DAYS,
  } as const;
}

function resolveDbUrl(url: string, dataDir: string): string {
  if (!url.startsWith("file:")) return url; // libsql://, http://... — pass through
  const raw = url.slice("file:".length);
  return "file:" + (path.isAbsolute(raw) ? raw : path.join(dataDir, raw));
}

export type Config = ReturnType<typeof load>;
export const config = load();
