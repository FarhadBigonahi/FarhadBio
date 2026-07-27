// Schema history, as data.
//
// Migrations are TypeScript arrays of statements rather than .sql files on
// purpose: no SQL-splitting parser to get wrong, they are typechecked, and they
// are compiled into dist/ so a production box never needs the source tree.
//
// RULES
//  - Append only. Never edit or renumber a migration that has shipped.
//  - Each `id` runs exactly once, in ascending order, and is recorded.
export type Migration = { id: number; name: string; statements: string[] };

export const migrations: Migration[] = [
  {
    id: 1,
    name: "init_posts_and_events",
    statements: [
      `CREATE TABLE IF NOT EXISTS posts (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        slug             TEXT UNIQUE NOT NULL,
        status           TEXT NOT NULL DEFAULT 'published',
        lang             TEXT NOT NULL DEFAULT 'fa',
        dir              TEXT NOT NULL DEFAULT 'rtl',
        emoji            TEXT NOT NULL DEFAULT '',
        title            TEXT NOT NULL,
        subtitle         TEXT NOT NULL DEFAULT '',
        excerpt          TEXT NOT NULL DEFAULT '',
        meta_title       TEXT NOT NULL DEFAULT '',
        meta_description TEXT NOT NULL DEFAULT '',
        cover            TEXT NOT NULL DEFAULT '',
        cover_fallback   TEXT NOT NULL DEFAULT '',
        cover_alt        TEXT NOT NULL DEFAULT '',
        cover_width      INTEGER NOT NULL DEFAULT 1200,
        cover_height     INTEGER NOT NULL DEFAULT 800,
        date             TEXT NOT NULL,
        date_fa          TEXT NOT NULL DEFAULT '',
        date_en          TEXT NOT NULL DEFAULT '',
        reading_minutes  INTEGER NOT NULL DEFAULT 1,
        reading_fa       TEXT NOT NULL DEFAULT '',
        tags             TEXT NOT NULL DEFAULT '[]',
        repo             TEXT NOT NULL DEFAULT '',
        npm              TEXT NOT NULL DEFAULT '',
        body             TEXT NOT NULL DEFAULT '[]',
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS events (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        ts       INTEGER NOT NULL,
        path     TEXT NOT NULL,
        referrer TEXT NOT NULL DEFAULT '',
        source   TEXT NOT NULL DEFAULT 'direct',
        country  TEXT NOT NULL DEFAULT '',
        device   TEXT NOT NULL DEFAULT 'desktop',
        session  TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)`,
      `CREATE INDEX IF NOT EXISTS idx_events_path ON events(path)`,
      // The dashboard's "published, newest first" query is the hottest read.
      `CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(status, date DESC)`,
    ],
  },
  {
    id: 2,
    name: "events_session_index",
    statements: [
      // COUNT(DISTINCT session) over a time window drives the visitors metric.
      `CREATE INDEX IF NOT EXISTS idx_events_ts_session ON events(ts, session)`,
    ],
  },
];
