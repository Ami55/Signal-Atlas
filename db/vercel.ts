import { neon } from "@neondatabase/serverless";
import legacyCaptures from "@/data/legacy-captures.json";

let client: ReturnType<typeof neon> | null = null;

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Connect a Neon Postgres database in Vercel Storage.");
  }
  client ??= neon(connectionString);
  return client;
}

let schemaReady: Promise<unknown> | null = null;

export function ensureSchema() {
  const sql = getSql();
  schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS captures (
        id BIGSERIAL PRIMARY KEY,
        created_at TEXT NOT NULL,
        query TEXT NOT NULL,
        query_norm TEXT NOT NULL UNIQUE,
        google_url TEXT NOT NULL,
        ai_text TEXT NOT NULL,
        tbl_mention TEXT NOT NULL DEFAULT '',
        tbl_mentioned INTEGER NOT NULL DEFAULT 0,
        contributor TEXT NOT NULL,
        location TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        mentioned_sites TEXT NOT NULL DEFAULT '',
        cited_sources TEXT NOT NULL DEFAULT '',
        screenshot_key TEXT
      )`;
    await sql`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
    const marker = await sql`SELECT key FROM app_meta WHERE key = 'legacy_seed_v1' LIMIT 1` as Array<Record<string, unknown>>;
    if (marker.length) return;

    for (let start = 0; start < legacyCaptures.length; start += 25) {
      const batch = legacyCaptures.slice(start, start + 25).map((row) => sql`INSERT INTO captures
        (created_at, query, query_norm, google_url, ai_text, tbl_mention, tbl_mentioned, contributor, location, notes, mentioned_sites, cited_sources, screenshot_key)
        VALUES (${row.created_at}, ${row.query}, ${row.query_norm}, ${row.google_url}, ${row.ai_text}, ${row.tbl_mention}, ${Number(row.tbl_mentioned || 0)}, ${row.contributor}, ${row.location}, ${row.notes}, ${row.mentioned_sites}, ${row.cited_sources}, ${null})
        ON CONFLICT (query_norm) DO NOTHING`);
      await sql.transaction(batch);
    }
    await sql`INSERT INTO app_meta (key, value) VALUES ('legacy_seed_v1', ${new Date().toISOString()}) ON CONFLICT (key) DO NOTHING`;
  })();
  return schemaReady;
}
