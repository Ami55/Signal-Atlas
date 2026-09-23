"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Capture = {
  id: number;
  createdAt: string;
  query: string;
  googleUrl: string;
  aiText: string;
  tblMention: string;
  tblMentioned: number;
  contributor: string;
  location: string;
  notes: string;
  mentionedSites: string;
  citedSources: string;
  screenshotUrl?: string | null;
};

type InsightItem = { name: string; count: number };
type Opportunity = { id: number; query: string; competitors: string[]; location: string };
type TopicInsight = { name: string; total: number; mentions: number; mentionRate: number };
type QueryInsight = { id: number; query: string; location: string; mentioned: boolean; cited: boolean; sourceCount: number; competitors: string[] };
type Insights = {
  total: number;
  mentionRate: number;
  citationRate: number;
  citationCoverage: number;
  citationCoverageCount: number;
  tblCitationCount: number;
  topCompetitors: InsightItem[];
  topCitedDomains: InsightItem[];
  topTblPages: InsightItem[];
  opportunities: Opportunity[];
  topics: TopicInsight[];
  queryRows: QueryInsight[];
};

function getMention(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized.split(/(?<=[.!?])\s+|(?=[A-Z][A-Za-z &]{2,36}:)/).map((part) => part.trim()).filter(Boolean);
  const matches = sentences.filter((part) => /toursbylocals/i.test(part));
  return matches.slice(0, 3).join(" ");
}

const knownBrands = ["ToursByLocals", "Viator", "GetYourGuide", "Withlocals", "GoWithGuide", "Showaround", "Airbnb Experiences", "Tripadvisor"];

function inferredMentions(text: string, recorded: string) {
  const detected = knownBrands.filter((brand) => text.toLowerCase().includes(brand.toLowerCase()));
  return [...new Set([...mentionedLines(recorded), ...detected])].join("\n");
}

function queryFromGoogleUrl(value: string) {
  try {
    return new URL(value).searchParams.get("q") ?? "";
  } catch {
    return "";
  }
}

export default function Home() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [view, setView] = useState<"capture" | "library" | "insights">("capture");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const bookmarkRef = useRef<HTMLAnchorElement>(null);
  const [form, setForm] = useState({
    googleUrl: "",
    query: "",
    aiText: "",
    contributor: "",
    location: "",
    notes: "",
    mentionedSites: "",
    citedSources: "",
  });

  const mention = useMemo(() => getMention(form.aiText), [form.aiText]);

  async function loadCaptures() {
    const response = await fetch("/api/captures");
    if (response.ok) setCaptures(await response.json());
  }

  async function loadInsights() {
    const response = await fetch("/api/insights");
    if (response.ok) setInsights(await response.json());
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let transferred: Record<string, string> = {};
    if (window.name.startsWith("signal-atlas:")) {
      try {
        transferred = JSON.parse(window.name.slice("signal-atlas:".length));
        window.name = "";
      } catch { /* Ignore malformed transfer data. */ }
    }
    const googleUrl = transferred.url ?? params.get("url") ?? "";
    const capturedText = transferred.text ?? params.get("text") ?? "";
    const capturedSources = transferred.sources ?? params.get("sources") ?? "";
    const capturedMentions = transferred.mentioned ?? params.get("mentioned") ?? "";
    const detectedBrands = knownBrands.filter((brand) => capturedText.toLowerCase().includes(brand.toLowerCase()));
    const rememberedContributor = window.localStorage.getItem("signal-atlas-contributor") ?? "";
    const rememberedLocation = window.localStorage.getItem("signal-atlas-location") ?? "";
    setForm((current) => ({
      ...current,
      googleUrl,
      query: transferred.query ?? params.get("query") ?? queryFromGoogleUrl(googleUrl),
      aiText: capturedText,
      citedSources: capturedSources,
      mentionedSites: capturedMentions || detectedBrands.join("\n"),
      contributor: current.contributor || rememberedContributor,
      location: current.location || rememberedLocation,
    }));
    const target = `${window.location.origin}/#capture-workspace`;
    bookmarkRef.current?.setAttribute("href", `javascript:(()=>{const G=h=>{try{let x=new URL(h,location.href);if(x.hostname.includes('google.')&&x.pathname==='/url'&&x.searchParams.get('q'))x=new URL(x.searchParams.get('q'));return x.protocol.startsWith('http')&&!x.hostname.includes('google.')?x.href:null}catch{return null}},V=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'},z=getSelection();let n=z&&z.rangeCount?z.getRangeAt(0).commonAncestorContainer:null;n=n&&n.nodeType===3?n.parentElement:n;let s=(z&&z.toString()||'').trim();if(!s){const m=[...document.querySelectorAll('h1,h2,h3,div,span')].filter(e=>V(e)&&/^AI Overview(?:$|\s)/i.test((e.innerText||'').trim())).sort((a,b)=>(a.innerText||'').length-(b.innerText||'').length)[0];if(m){let e=m,b=null;for(let i=0;e&&i<12;i++,e=e.parentElement){const t=(e.innerText||'').trim(),l=[...e.querySelectorAll('a[href]')].map(a=>G(a.href)).filter(Boolean).length;if(t.length>=250&&t.length<=20000&&(l>0||t.length>=500)){b=e;if(l>0&&t.length<12000)break}}n=b||m.parentElement;s=(n&&n.innerText||'').trim()}}if(!s){alert('Signal Atlas could not find an AI Overview on this page. Make sure it is expanded, then try again.');return}let e=n,a=[];for(let i=0;e&&i<8;i++,e=e.parentElement){const q=[...e.querySelectorAll('a[href]')].map(x=>G(x.href)).filter(Boolean);if(q.length){a=[...new Set(q)].slice(0,50);if(q.length>=2)break}}const known=['ToursByLocals','Viator','GetYourGuide','Withlocals','GoWithGuide','Showaround','Airbnb Experiences','Tripadvisor'],hosts=a.map(x=>{try{return new URL(x).hostname.replace(/^www\./,'')}catch{return''}}).filter(Boolean),mentioned=[...new Set([...known.filter(x=>s.toLowerCase().includes(x.toLowerCase())),...hosts])];const p={url:location.href,query:new URL(location.href).searchParams.get('q')||'',text:s,sources:a.join('\n'),mentioned:mentioned.join('\n')},w=open('about:blank','_blank');if(!w){alert('Please allow pop-ups for Google, then click the bookmark again.');return}w.name='signal-atlas:'+JSON.stringify(p);w.location='${target}'})()`);
    loadCaptures();
    loadInsights();
    if (capturedText) window.setTimeout(() => document.getElementById("capture-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage("");
    const data = new FormData(formElement);
    data.set("tblMention", mention);
    try {
      const response = await fetch("/api/captures", { method: "POST", body: data });
      if (response.status === 409) {
        const duplicate = await response.json() as { existingQuery?: string };
        setMessage(`Already captured: “${duplicate.existingQuery || form.query}”. This duplicate was not saved.`);
        return;
      }
      if (!response.ok) throw new Error("Save failed");
      window.localStorage.setItem("signal-atlas-contributor", form.contributor);
      window.localStorage.setItem("signal-atlas-location", form.location);
      setMessage("Snapshot saved to the shared library.");
      setForm({ googleUrl: "", query: "", aiText: "", contributor: form.contributor, location: form.location, notes: "", mentionedSites: "", citedSources: "" });
      const screenshotInput = formElement.elements.namedItem("screenshot") as HTMLInputElement | null;
      if (screenshotInput) screenshotInput.value = "";
      await loadCaptures();
    } catch {
      setMessage("We couldn't save this snapshot. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function deleteCapture(capture: Capture) {
    if (!window.confirm(`Delete the snapshot for “${capture.query}”? This cannot be undone.`)) return;
    setDeletingId(capture.id);
    try {
      const response = await fetch(`/api/captures?id=${capture.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setCaptures((current) => current.filter((item) => item.id !== capture.id));
    } catch {
      window.alert("We couldn't delete this snapshot. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Signal Atlas home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Signal Atlas</span>
        </a>
        <nav aria-label="Primary navigation">
          <button className={view === "capture" ? "active" : ""} onClick={() => setView("capture")}>Capture</button>
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>Library <span>{captures.length}</span></button>
          <button className={view === "insights" ? "active" : ""} onClick={() => { setView("insights"); loadInsights(); }}>Insights</button>
        </nav>
      </header>

      {view === "capture" ? (
        <>
          <section className="hero">
            <p className="eyebrow">AI search visibility</p>
            <h1>Turn a search result<br />into <em>evidence.</em></h1>
            <p className="dek">Capture what Google said, where ToursByLocals appeared, and which sources shaped the answer.</p>
            <div className="steps" aria-label="How it works">
              <span><b>01</b>Open a Google AI Overview</span>
              <span><b>02</b>Click your capture bookmark</span>
              <span><b>03</b>Save the snapshot</span>
            </div>
          </section>

          <section className="how-it-works" aria-labelledby="how-title">
            <div className="how-heading"><div><p className="eyebrow">How it works</p><h2 id="how-title">From Google search<br />to shared insight.</h2></div><p>Use the bookmark once for each query. Signal Atlas brings the important evidence into one consistent record—without copying and pasting.</p></div>
            <div className="how-grid">
              <article><span>01</span><i className="how-icon">⌕</i><h3>Search on Google</h3><p>Run a question and wait for the complete AI Overview to appear.</p><small>You see: answer text, mentioned brands and source chips.</small></article>
              <article><span>02</span><i className="how-icon">✦</i><h3>Click the bookmark</h3><p>Click <strong>Capture AI Overview</strong> in your bookmarks bar.</p><small>It collects: query, answer, citations and the Google URL.</small></article>
              <article><span>03</span><i className="how-icon">✓</i><h3>Review and save</h3><p>Signal Atlas opens with the form already filled. Check it and save.</p><small>You add: your name, location and any useful notes.</small></article>
              <article><span>04</span><i className="how-icon">↗</i><h3>Compare the evidence</h3><p>Use Library and Insights to track visibility across all searches.</p><small>Measure: mentions, citations, competitors and content gaps.</small></article>
            </div>
          </section>

          <section className="workspace" id="capture-workspace">
            <aside className="bookmark-card">
              <p className="card-kicker">One-time setup</p>
              <h2>Add the capture bookmark</h2>
              <p>Drag this button to your bookmarks bar. On Google, click it and Signal Atlas will find the AI Overview, text, and citations automatically.</p>
              <a ref={bookmarkRef} className="bookmark-button" href="#" onClick={(e) => e.preventDefault()} title="Drag this button to your bookmarks bar">✦ Capture AI Overview</a>
              <div className="tiny-note"><span>Fallback</span> If Google changes its layout, select the AI Overview text first and click the bookmark again—or paste it into the form.</div>
            </aside>

            <form className="capture-form" onSubmit={submit}>
              <div className="form-heading">
                <div><p className="card-kicker">New snapshot</p><h2>What did Google show?</h2></div>
                <span className={mention ? "detected yes" : "detected"}>{mention ? "ToursByLocals detected" : "Waiting for text"}</span>
              </div>

              <label>Google search link<input required name="googleUrl" type="url" placeholder="https://www.google.com/search?q=..." value={form.googleUrl} onChange={(e) => { update("googleUrl", e.target.value); if (!form.query) update("query", queryFromGoogleUrl(e.target.value)); }} /></label>
              <div className="row">
                <label>Search query<input required name="query" value={form.query} onChange={(e) => update("query", e.target.value)} placeholder="What did you search?" /></label>
                <label>Your location <small>remembered automatically</small><input required name="location" autoComplete="address-level2" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Vancouver, Canada" /></label>
              </div>
              <label>AI Overview text<textarea required name="aiText" rows={9} value={form.aiText} onChange={(e) => update("aiText", e.target.value)} placeholder="Paste the complete AI Overview, including headings and source names…" /></label>
              {mention && <div className="mention-box"><span>Exact ToursByLocals mention</span><p>{mention}</p></div>}
              <div className="row">
                <label>Sites or brands mentioned <small>one per line</small><textarea name="mentionedSites" rows={4} value={form.mentionedSites} onChange={(e) => update("mentionedSites", e.target.value)} placeholder={"Withlocals\nGetYourGuide\nViator"} /></label>
                <label>Cited source URLs <small>one per line</small><textarea name="citedSources" rows={4} value={form.citedSources} onChange={(e) => update("citedSources", e.target.value)} placeholder={"https://www.toursbylocals.com/...\nhttps://example.com/..."} /></label>
              </div>
              <div className="row">
                <label>Your name<input required name="contributor" value={form.contributor} onChange={(e) => update("contributor", e.target.value)} placeholder="Name" /></label>
                <label>Screenshot<input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" /></label>
              </div>
              <label>Notes <small>optional</small><textarea name="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Accuracy concerns, competitors, or follow-up ideas…" /></label>
              <div className="form-footer"><p>{message || "Saved snapshots are visible to everyone with access."}</p><button className="save-button" disabled={saving}>{saving ? "Saving…" : "Save snapshot"} <span>→</span></button></div>
            </form>
          </section>
        </>
      ) : view === "library" ? (
        <section className="library">
          <div className="library-heading"><div><p className="eyebrow">Shared intelligence</p><h1>Snapshot library</h1></div><button onClick={() => setView("capture")}>+ New capture</button></div>
          <div className="metrics"><div><strong>{captures.length}</strong><span>Total snapshots</span></div><div><strong>{captures.filter((c) => c.tblMentioned).length}</strong><span>ToursByLocals mentions</span></div><div><strong>{captures.filter((c) => /toursbylocals\.com/i.test(c.citedSources || "")).length}</strong><span>ToursByLocals citations</span></div></div>
          <div className="capture-list">
            {captures.length === 0 ? <div className="empty"><span>✦</span><h2>No snapshots yet</h2><p>Capture the first Google AI Overview to begin the evidence library.</p></div> : captures.map((capture) => (
              <article key={capture.id} className="capture-item">
                <div className="capture-meta"><span>{new Date(capture.createdAt).toLocaleDateString()}</span><span>{capture.location}</span><span>by {capture.contributor}</span></div>
                <h2>{capture.query}</h2>
                <div className="source-grid">
                  <div><span>Mentioned</span><MentionChips value={inferredMentions(capture.aiText, capture.mentionedSites)} sources={capture.citedSources} /></div>
                  <div><span>Cited sources</span><SourceSummary value={capture.citedSources} /></div>
                </div>
                <div className="capture-actions"><span className={capture.tblMentioned ? "pill yes" : "pill"}>{capture.tblMentioned ? "Mentioned" : "Not mentioned"}</span><button className="view-button" onClick={() => setExpandedId(expandedId === capture.id ? null : capture.id)}>{expandedId === capture.id ? "Close snapshot" : "View snapshot"}</button><a href={capture.googleUrl} target="_blank" rel="noreferrer">Open Google search ↗</a>{capture.screenshotUrl && <a href={capture.screenshotUrl} target="_blank" rel="noreferrer">View screenshot ↗</a>}<button className="delete-button" onClick={() => deleteCapture(capture)} disabled={deletingId === capture.id}>{deletingId === capture.id ? "Deleting…" : "Delete"}</button></div>
                {expandedId === capture.id && <div className="snapshot-view">
                  <div className="snapshot-head"><span>Google AI Overview</span><small>Captured {new Date(capture.createdAt).toLocaleString()}</small></div>
                  <div className="snapshot-copy">{formatOverview(capture.aiText).map((paragraph, index) => <LinkedParagraph key={index} text={paragraph} sources={capture.citedSources} />)}</div>
                </div>}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="insights-page">
          <div className="library-heading"><div><p className="eyebrow">AI visibility intelligence</p><h1>What the data says</h1></div><button onClick={loadInsights}>Refresh insights</button></div>
          {!insights ? <div className="empty"><span>✦</span><h2>Analysing the library…</h2></div> : <>
            <div className="insight-kpis">
              <div><span>Snapshots analysed</span><strong>{insights.total}</strong><small>All captured searches</small></div>
              <div><span>Mention rate</span><strong>{insights.mentionRate}%</strong><small>ToursByLocals appears in the answer</small></div>
              <div><span>Citation rate</span><strong>{insights.citationRate}%</strong><small>{insights.tblCitationCount} of {insights.total} captures cite a ToursByLocals page</small></div>
              <div><span>Source coverage</span><strong>{insights.citationCoverage}%</strong><small>{insights.citationCoverageCount} of {insights.total} captures include source URLs</small></div>
            </div>

            <div className="insight-grid">
              <div className="insight-card"><div className="insight-title"><p className="card-kicker">Competitive set</p><h2>Most-mentioned competitors</h2></div><RankedList items={insights.topCompetitors} empty="No competitors recorded yet." /></div>
              <div className="insight-card"><div className="insight-title"><p className="card-kicker">Source authority</p><h2>Most-cited domains</h2></div><RankedList items={insights.topCitedDomains} empty="Add cited source URLs to reveal this ranking." /></div>
            </div>

            <div className="insight-card wide"><div className="insight-title"><p className="card-kicker">Captured query performance</p><h2>Visibility across your actual searches</h2></div><div className="query-table"><div className="query-row query-head"><span>Captured query</span><span>Location</span><span>Visibility</span><span>Sources</span></div>{insights.queryRows.map((item) => <div className="query-row" key={item.id}><strong>{item.query}</strong><span>{item.location}</span><span className="status-group"><i className={item.mentioned ? "status on" : "status"}>Mentioned</i><i className={item.cited ? "status cited" : "status"}>Cited</i></span><span>{item.sourceCount || "—"}</span></div>)}</div></div>

            <div className="insight-grid lower">
              <div className="insight-card"><div className="insight-title"><p className="card-kicker">Owned authority</p><h2>Top cited ToursByLocals pages</h2></div><RankedList items={insights.topTblPages} empty="No ToursByLocals source URLs recorded yet." /></div>
              <div className="insight-card opportunities"><div className="insight-title"><p className="card-kicker">Content gaps</p><h2>Queries to act on next</h2></div>{insights.opportunities.length ? insights.opportunities.map((item) => <div className="opportunity" key={item.id}><span>{item.location}</span><strong>{item.query}</strong><p>{item.competitors.length ? `${item.competitors.join(", ")} appeared; ToursByLocals did not.` : "ToursByLocals did not appear in this answer."}</p></div>) : <p className="empty-copy">No visibility gaps found in the current data.</p>}</div>
            </div>
          </>}
        </section>
      )}
      <footer><span>Signal Atlas</span><p>© 2026 Signal Atlas. Developed by Ami – SEO Girl. All rights reserved.</p></footer>
    </main>
  );
}

function RankedList({ items, empty }: { items: InsightItem[]; empty: string }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  if (!items.length) return <p className="empty-copy">{empty}</p>;
  return <div className="ranked-list">{items.map((item, index) => <div className="ranked-item" key={item.name}><b>{String(index + 1).padStart(2, "0")}</b><div><span>{item.name}</span><i style={{width:`${Math.max(5, item.count / max * 100)}%`}} /></div><strong>{item.count}</strong></div>)}</div>;
}

function sourceLines(value: string) {
  const urls = value.match(/https?:\/\/.*?(?=https?:\/\/|\s*$)/g);
  return [...new Set((urls?.length ? urls : value.split(/[\n,]+/)).map((item) => item.trim()).filter(Boolean))];
}

function sourceDomain(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function sourcePath(value: string) {
  try { const url = new URL(value); return `${url.pathname === "/" ? "Homepage" : decodeURIComponent(url.pathname)}${url.search}`; }
  catch { return "Captured citation"; }
}

function mentionedLines(value: string) {
  const domains = value.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}/gi) ?? [];
  const lines = value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  return [...new Set(domains.length > lines.length ? domains : lines)];
}

function MentionChips({ value, sources }: { value: string; sources: string }) {
  const citedDomains = sourceLines(sources).map(sourceDomain);
  const recorded = mentionedLines(value).filter((item) => {
    if (item.length > 70) return false;
    if (citedDomains.length && item.includes(".")) return false;
    return true;
  });
  const items = [...new Set([...recorded, ...citedDomains])];
  return items.length ? <div className="mention-chips">{items.map((item) => <i key={item}>{item}</i>)}</div> : <p className="empty-source">None recorded</p>;
}

function SourceSummary({ value }: { value: string }) {
  const items = sourceLines(value);
  return items.length ? <div className="source-summary">{items.map((item) => <a href={item} target="_blank" rel="noreferrer" key={item}>{sourceDomain(item)} <i>↗</i></a>)}</div> : <p className="empty-source">Not captured in this version</p>;
}

function LinkedParagraph({ text, sources }: { text: string; sources: string }) {
  const links = sourceLines(sources);
  const matches: { start: number; end: number; url: string }[] = [];
  for (const url of links) {
    const host = sourceDomain(url);
    const direct = text.toLowerCase().indexOf(host.toLowerCase());
    if (direct >= 0) { matches.push({ start: direct, end: direct + host.length, url }); continue; }
    const target = host.split(".").slice(0, -1).join("").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const words = [...text.matchAll(/[A-Za-z0-9]+/g)];
    for (let start = 0; start < words.length; start++) {
      let joined = "";
      for (let end = start; end < Math.min(words.length, start + 5); end++) {
        joined += words[end][0].toLowerCase();
        if (joined === target) { matches.push({ start: words[start].index!, end: words[end].index! + words[end][0].length, url }); start = words.length; break; }
        if (!target.startsWith(joined)) break;
      }
    }
  }
  const ordered = matches.sort((a, b) => a.start - b.start).filter((match, index, all) => !index || match.start >= all[index - 1].end);
  if (!ordered.length) return <p>{text}</p>;
  const parts = []; let cursor = 0;
  for (const match of ordered) { parts.push(text.slice(cursor, match.start)); parts.push(<a href={match.url} target="_blank" rel="noreferrer" key={`${match.url}-${match.start}`}>{text.slice(match.start, match.end)} ↗</a>); cursor = match.end; }
  parts.push(text.slice(cursor));
  return <p>{parts}</p>;
}

function formatOverview(value: string) {
  const clean = value.replace(/^AI Overview\s*/i, "").replace(/\s+\+\d+(?=\s|$)/g, "").replace(/([.!?])(?=[A-Z][A-Za-z &]{2,42}:)/g, "$1\n").trim();
  const originalParagraphs = clean.split(/\n{2,}|\n(?=[•*-]|[A-Z][^\n]{2,40}:)/).map((item) => item.replace(/^[•*-]\s*/, "").trim()).filter(Boolean);
  if (originalParagraphs.length > 1) return originalParagraphs;
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  if (sentences.length < 3) return [clean];
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) paragraphs.push(sentences.slice(index, index + 2).join(" "));
  return paragraphs;
}
