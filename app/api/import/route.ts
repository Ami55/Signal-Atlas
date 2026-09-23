import { parse } from "csv-parse/sync";
import { ensureSchema, getSql } from "@/db/vercel";

export const dynamic = "force-dynamic";

type LegacyRow = {
  "Topic Name"?: string;
  Prompt?: string;
  "Monthly Search Volume"?: string;
  "Model Name"?: string;
  "Mentioned Brand Names"?: string;
  "Citation URLs"?: string;
  Time?: string;
  created_at?: string;
  query?: string;
  query_norm?: string;
  google_url?: string;
  ai_text?: string;
  tbl_mention?: string;
  tbl_mentioned?: string;
  contributor?: string;
  location?: string;
  notes?: string;
  mentioned_sites?: string;
  cited_sources?: string;
  screenshot_key?: string;
};

function normalizeQuery(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function asLines(value: string) {
  return value.split(/\s*,\s*|\n+/).map((item) => item.trim()).filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  await ensureSchema();
  const sql = getSql();
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return Response.json({ error: "Choose a CSV export first." }, { status: 400 });
  }
  if (file.size > 4_000_000) {
    return Response.json({ error: "The CSV must be smaller than 4 MB." }, { status: 400 });
  }

  const rows = parse(await file.text(), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as LegacyRow[];
  const valid = rows.filter((row) => row.query?.trim() || row.Prompt?.trim());
  let imported = 0;

  for (let start = 0; start < valid.length; start += 50) {
    const batch = valid.slice(start, start + 50).map((row) => {
      const isFullExport = Boolean(row.query?.trim());
      const query = (row.query || row.Prompt || "").trim();
      const mentionedSites = isFullExport ? (row.mentioned_sites ?? "") : asLines(row["Mentioned Brand Names"] ?? "");
      const citedSources = isFullExport ? (row.cited_sources ?? "") : asLines(row["Citation URLs"] ?? "");
      const tblMentioned = isFullExport ? Number(row.tbl_mentioned || 0) : (/toursbylocals/i.test(mentionedSites) ? 1 : 0);
      const topic = row["Topic Name"]?.trim() || "Legacy capture";
      const volume = row["Monthly Search Volume"]?.trim();
      const model = row["Model Name"]?.trim() || "Google AI Overview";
      const notes = isFullExport ? (row.notes ?? "") : [topic, volume ? `Monthly search volume: ${volume}` : "", `Imported from ${model}`].filter(Boolean).join(" · ");
      const createdAt = row.created_at?.trim() || row.Time?.trim() || new Date().toISOString();
      const googleUrl = row.google_url?.trim() || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const aiText = row.ai_text?.trim() || "Legacy capture imported from the previous Signal Atlas dataset. The original export did not include the full AI Overview text.";
      const tblMention = row.tbl_mention?.trim() || (tblMentioned ? "ToursByLocals" : "");
      const contributor = row.contributor?.trim() || "Legacy import";
      const location = row.location?.trim() || "Not recorded";
      const screenshotKey = row.screenshot_key?.startsWith("http") ? row.screenshot_key : null;
      return sql`INSERT INTO captures
        (created_at, query, query_norm, google_url, ai_text, tbl_mention, tbl_mentioned, contributor, location, notes, mentioned_sites, cited_sources, screenshot_key)
        VALUES (${createdAt}, ${query}, ${row.query_norm?.trim() || normalizeQuery(query)}, ${googleUrl}, ${aiText}, ${tblMention}, ${tblMentioned}, ${contributor}, ${location}, ${notes}, ${mentionedSites}, ${citedSources}, ${screenshotKey})
        ON CONFLICT (query_norm) DO NOTHING
        RETURNING id`;
    });
    const results = await sql.transaction(batch);
    imported += results.filter((result) => Array.isArray(result) && result.length > 0).length;
  }

  return Response.json({ imported, skipped: valid.length - imported, total: valid.length });
}
