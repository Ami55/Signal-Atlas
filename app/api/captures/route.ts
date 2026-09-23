import { del, put } from "@vercel/blob";
import { ensureSchema, getSql } from "@/db/vercel";

export const dynamic = "force-dynamic";

function normalizeQuery(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
}

export async function GET() {
  await ensureSchema();
  const sql = getSql();
  const result = await sql`SELECT id, created_at AS "createdAt", query, google_url AS "googleUrl",
    ai_text AS "aiText", tbl_mention AS "tblMention", tbl_mentioned AS "tblMentioned",
    contributor, location, notes, mentioned_sites AS "mentionedSites",
    cited_sources AS "citedSources", screenshot_key AS "screenshotKey"
    FROM captures ORDER BY created_at DESC LIMIT 250` as Array<Record<string, unknown>>;
  const rows = result.map((row) => ({
    ...row,
    id: Number(row.id),
    screenshotUrl: row.screenshotKey || null,
  }));
  return Response.json(rows);
}

export async function POST(request: Request) {
  await ensureSchema();
  const sql = getSql();
  const data = await request.formData();
  const query = String(data.get("query") ?? "").trim();
  const googleUrl = String(data.get("googleUrl") ?? "").trim();
  const aiText = String(data.get("aiText") ?? "").trim();
  const contributor = String(data.get("contributor") ?? "").trim();
  const location = String(data.get("location") ?? "").trim();
  const notes = String(data.get("notes") ?? "").trim();
  const mentionedSites = String(data.get("mentionedSites") ?? "").trim();
  const citedSources = String(data.get("citedSources") ?? "").trim();
  const tblMention = String(data.get("tblMention") ?? "").trim();
  if (!query || !googleUrl || !aiText || !contributor || !location) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const queryNorm = normalizeQuery(query);
  const duplicates = await sql`SELECT id, query FROM captures WHERE query_norm = ${queryNorm} LIMIT 1` as Array<Record<string, unknown>>;
  const duplicate = duplicates[0];
  if (duplicate) {
    return Response.json({ error: "Duplicate query", duplicateId: duplicate.id, existingQuery: duplicate.query }, { status: 409 });
  }

  let screenshotKey: string | null = null;
  const screenshot = data.get("screenshot");
  if (screenshot instanceof File && screenshot.size > 0) {
    if (screenshot.size > 4_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(screenshot.type)) {
      return Response.json({ error: "Screenshot must be PNG, JPEG, or WebP under 4 MB" }, { status: 400 });
    }
    const filename = `${crypto.randomUUID()}-${screenshot.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const blob = await put(`snapshots/${filename}`, screenshot, { access: "public", addRandomSuffix: false });
    screenshotKey = blob.url;
  }

  const createdAt = new Date().toISOString();
  const result = await sql`INSERT INTO captures
    (created_at, query, query_norm, google_url, ai_text, tbl_mention, tbl_mentioned, contributor, location, notes, mentioned_sites, cited_sources, screenshot_key)
    VALUES (${createdAt}, ${query}, ${queryNorm}, ${googleUrl}, ${aiText}, ${tblMention}, ${tblMention ? 1 : 0}, ${contributor}, ${location}, ${notes}, ${mentionedSites}, ${citedSources}, ${screenshotKey})
    RETURNING id` as Array<Record<string, unknown>>;
  return Response.json({ id: Number(result[0].id), createdAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  await ensureSchema();
  const sql = getSql();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return Response.json({ error: "Invalid snapshot id" }, { status: 400 });
  }

  const existingRows = await sql`SELECT screenshot_key AS "screenshotKey" FROM captures WHERE id = ${id}` as Array<Record<string, unknown>>;
  const existing = existingRows[0];
  if (!existing) return Response.json({ error: "Snapshot not found" }, { status: 404 });

  await sql`DELETE FROM captures WHERE id = ${id}`;
  if (existing.screenshotKey) await del(String(existing.screenshotKey));
  return Response.json({ deleted: true });
}
