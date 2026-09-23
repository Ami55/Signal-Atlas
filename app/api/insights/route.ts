import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  query: string;
  aiText: string;
  tblMentioned: number;
  location: string;
  mentionedSites: string;
  citedSources: string;
};

const competitorPatterns: Array<[string, RegExp]> = [
  ["Viator", /\bviator\b/i],
  ["GetYourGuide", /\bgetyourguide\b/i],
  ["Withlocals", /\bwithlocals\b/i],
  ["GoWithGuide", /\bgowithguide\b/i],
  ["Showaround", /\bshowaround\b/i],
  ["Airbnb Experiences", /\bairbnb experiences?\b/i],
  ["Tripadvisor", /\btripadvisor\b/i],
  ["ToursByLocals", /\btoursbylocals\b/i],
];

const topicPatterns: Array<[string, RegExp]> = [
  ["Guide trust & vetting", /vet|background|safe|trust|legitimate|licen[cs]|qualif|select.*guide/i],
  ["Cruise & shore excursions", /cruise|shore|port|ship/i],
  ["Comparisons & booking", /best|versus|\bvs\b|alternative|platform|website|book/i],
  ["Families & accessibility", /famil|child|senior|wheelchair|accessib|mobility|solo|couple/i],
  ["Pricing & policies", /cost|price|tip|cancel|refund|policy|include/i],
  ["Destination tours", /\b(rome|paris|london|tokyo|barcelona|athens|lisbon|florence|vatican|kyoto|amsterdam|istanbul|alaska)\b/i],
];

function lines(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }
function add(map: Map<string, number>, key: string) { map.set(key, (map.get(key) ?? 0) + 1); }
function ranked(map: Map<string, number>, limit = 10) { return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit); }

export async function GET() {
  const result = await env.DB.prepare(`SELECT id, query, ai_text AS aiText, tbl_mentioned AS tblMentioned,
    location, mentioned_sites AS mentionedSites, cited_sources AS citedSources
    FROM captures ORDER BY created_at DESC LIMIT 5000`).all<Row>();
  const rows = result.results ?? [];
  const competitors = new Map<string, number>();
  const domains = new Map<string, number>();
  const tblPages = new Map<string, number>();
  const topics = new Map<string, { total: number; mentions: number }>();
  let tblCitations = 0;
  let withCitations = 0;

  const opportunities = rows.flatMap((row) => {
    const haystack = `${row.aiText}\n${row.mentionedSites}`;
    const found = competitorPatterns.filter(([name, pattern]) => name !== "ToursByLocals" && pattern.test(haystack)).map(([name]) => name);
    found.forEach((name) => add(competitors, name));
    const topic = topicPatterns.find(([, pattern]) => pattern.test(row.query))?.[0] ?? "General private tours";
    const current = topics.get(topic) ?? { total: 0, mentions: 0 };
    current.total += 1;
    current.mentions += row.tblMentioned ? 1 : 0;
    topics.set(topic, current);

    const urls = lines(row.citedSources);
    if (urls.length) withCitations += 1;
    let rowHasTblCitation = false;
    urls.forEach((value) => {
      try {
        const url = new URL(value.startsWith("http") ? value : `https://${value}`);
        const domain = url.hostname.replace(/^www\./, "").toLowerCase();
        add(domains, domain);
        if (domain.endsWith("toursbylocals.com")) {
          rowHasTblCitation = true;
          add(tblPages, url.href.split(/[?#]/)[0].replace(/\/$/, ""));
        }
      } catch { /* Keep malformed source text out of domain rankings. */ }
    });
    if (rowHasTblCitation) tblCitations += 1;
    return !row.tblMentioned ? [{ id: row.id, query: row.query, competitors: found, location: row.location }] : [];
  }).slice(0, 12);

  const total = rows.length;
  const mentions = rows.filter((row) => row.tblMentioned).length;
  const queryRows = rows.map((row) => {
    const urls = lines(row.citedSources);
    const cited = urls.some((value) => {
      try { return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.toLowerCase().endsWith("toursbylocals.com"); }
      catch { return false; }
    });
    const haystack = `${row.aiText}\n${row.mentionedSites}`;
    const found = competitorPatterns.filter(([name, pattern]) => name !== "ToursByLocals" && pattern.test(haystack)).map(([name]) => name);
    return { id: row.id, query: row.query, location: row.location, mentioned: Boolean(row.tblMentioned), cited, sourceCount: urls.length, competitors: found };
  });
  return Response.json({
    total,
    mentionRate: total ? Math.round(mentions / total * 100) : 0,
    citationRate: total ? Math.round(tblCitations / total * 100) : 0,
    citationCoverage: total ? Math.round(withCitations / total * 100) : 0,
    citationCoverageCount: withCitations,
    tblCitationCount: tblCitations,
    topCompetitors: ranked(competitors),
    topCitedDomains: ranked(domains),
    topTblPages: ranked(tblPages),
    opportunities,
    topics: [...topics].map(([name, value]) => ({ name, ...value, mentionRate: Math.round(value.mentions / value.total * 100) })).sort((a, b) => b.total - a.total),
    queryRows,
  });
}
