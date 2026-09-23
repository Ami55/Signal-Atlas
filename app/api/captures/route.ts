import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

function normalizeQuery(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const result = await env.DB.prepare(`SELECT id, created_at AS createdAt, query, google_url AS googleUrl,
    ai_text AS aiText, tbl_mention AS tblMention, tbl_mentioned AS tblMentioned,
    contributor, location, notes, mentioned_sites AS mentionedSites,
    cited_sources AS citedSources, screenshot_key AS screenshotKey
    FROM captures ORDER BY created_at DESC LIMIT 250`).all();
  const rows = (result.results ?? []).map((row) => ({
    ...row,
    screenshotUrl: row.screenshotKey ? `/api/screenshots/${row.screenshotKey}` : null,
  }));
  return Response.json(rows);
}

export async function POST(request: Request) {
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
  const duplicate = await env.DB.prepare("SELECT id, query FROM captures WHERE query_norm = ? LIMIT 1")
    .bind(queryNorm)
    .first<{ id: number; query: string }>();
  if (duplicate) {
    return Response.json({ error: "Duplicate query", duplicateId: duplicate.id, existingQuery: duplicate.query }, { status: 409 });
  }

  let screenshotKey: string | null = null;
  const screenshot = data.get("screenshot");
  if (screenshot instanceof File && screenshot.size > 0) {
    if (screenshot.size > 8_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(screenshot.type)) {
      return Response.json({ error: "Screenshot must be PNG, JPEG, or WebP under 8 MB" }, { status: 400 });
    }
    screenshotKey = `${crypto.randomUUID()}-${screenshot.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await env.SNAPSHOTS.put(screenshotKey, await screenshot.arrayBuffer(), { httpMetadata: { contentType: screenshot.type } });
  }

  const createdAt = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO captures
    (created_at, query, query_norm, google_url, ai_text, tbl_mention, tbl_mentioned, contributor, location, notes, mentioned_sites, cited_sources, screenshot_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(createdAt, query, queryNorm, googleUrl, aiText, tblMention, tblMention ? 1 : 0, contributor, location, notes, mentionedSites, citedSources, screenshotKey).run();
  return Response.json({ id: result.meta.last_row_id, createdAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return Response.json({ error: "Invalid snapshot id" }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT screenshot_key AS screenshotKey FROM captures WHERE id = ?")
    .bind(id)
    .first<{ screenshotKey: string | null }>();
  if (!existing) return Response.json({ error: "Snapshot not found" }, { status: 404 });

  await env.DB.prepare("DELETE FROM captures WHERE id = ?").bind(id).run();
  if (existing.screenshotKey) await env.SNAPSHOTS.delete(existing.screenshotKey);
  return Response.json({ deleted: true });
}
