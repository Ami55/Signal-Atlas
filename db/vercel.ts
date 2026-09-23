import { neon } from "@neondatabase/serverless";

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
  schemaReady ??= sql`
    CREATE TABLE IF NOT EXISTS captures (
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
    )
  `;
  return schemaReady;
}
