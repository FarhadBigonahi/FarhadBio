// Forward-only migration runner.
//
// Deliberately tiny: an applied-ids table, ascending order, one transaction per
// migration. No down-migrations — rolling a schema back in production is a
// restore-from-backup operation, not a code path worth maintaining.
import { db } from "./client";
import { migrations } from "./migrations";

export type MigrateResult = { applied: number[]; alreadyUpToDate: boolean };

export async function migrate(
  log: (msg: string) => void = () => {}
): Promise<MigrateResult> {
  const c = db();

  await c.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
       id         INTEGER PRIMARY KEY,
       name       TEXT NOT NULL,
       applied_at INTEGER NOT NULL
     )`
  );

  const done = new Set(
    (await c.execute("SELECT id FROM _migrations")).rows.map((r) => Number(r.id))
  );

  const pending = [...migrations]
    .sort((a, b) => a.id - b.id)
    .filter((m) => !done.has(m.id));

  const applied: number[] = [];
  for (const m of pending) {
    const tx = await c.transaction("write");
    try {
      for (const sql of m.statements) await tx.execute(sql);
      await tx.execute({
        sql: "INSERT INTO _migrations (id, name, applied_at) VALUES (?,?,?)",
        args: [m.id, m.name, Date.now()],
      });
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw new Error(`Migration ${m.id} (${m.name}) failed: ${String(err)}`);
    }
    applied.push(m.id);
    log(`migrated ${m.id} — ${m.name}`);
  }

  return { applied, alreadyUpToDate: applied.length === 0 };
}
