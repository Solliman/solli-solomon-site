// Riepilogo statistiche anonime. GET /api/s?days=1|7|30
// Protetto da "Authorization: Bearer <STATS_TOKEN>" (secret di Pages).

const SECTIONS = ["music", "articles", "cenacolo", "contact"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Confronto a tempo costante, per non far indovinare il token un carattere alla volta.
async function sameToken(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequestGet({ request, env }) {
  const expected = env.STATS_TOKEN;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!expected || !token || !(await sameToken(token, expected))) {
    return json({ error: "unauthorized" }, 401);
  }

  const days = [1, 7, 30].includes(Number(new URL(request.url).searchParams.get("days")))
    ? Number(new URL(request.url).searchParams.get("days"))
    : 7;
  const since = Date.now() - days * 86400000;
  const db = env.DB;
  const all = (sql) => db.prepare(sql).bind(since).all().then((r) => r.results);
  const one = (sql) => db.prepare(sql).bind(since).first();

  const [
    totals, pages, clicks, scrollBase, scroll, time,
    artOpen, artRead, langs, countries, devices, refs, sections, langToggle,
  ] = await Promise.all([
    one(`SELECT COUNT(DISTINCT sid) AS visits,
                SUM(type = 'pageview') AS pageviews,
                COUNT(*) AS events
         FROM events WHERE ts >= ?1`),
    all(`SELECT page, COUNT(*) AS views, COUNT(DISTINCT sid) AS visits
         FROM events WHERE ts >= ?1 AND type = 'pageview'
         GROUP BY page ORDER BY views DESC LIMIT 25`),
    all(`SELECT target, COUNT(*) AS clicks, COUNT(DISTINCT sid) AS visits
         FROM events WHERE ts >= ?1 AND type = 'click' AND target IS NOT NULL
         GROUP BY target ORDER BY clicks DESC LIMIT 100`),
    one(`SELECT COUNT(*) AS n FROM (SELECT DISTINCT sid, page FROM events
         WHERE ts >= ?1 AND type = 'pageview')`),
    all(`SELECT CAST(MAX(value) AS INTEGER) AS depth FROM events
         WHERE ts >= ?1 AND type = 'scroll' GROUP BY sid, page`),
    one(`SELECT AVG(s) AS avg_per_visit
         FROM (SELECT sid, SUM(value) AS s FROM events
               WHERE ts >= ?1 AND type = 'time' GROUP BY sid)`),
    all(`SELECT target, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 AND type = 'article_open' AND target IS NOT NULL
         GROUP BY target ORDER BY visits DESC LIMIT 50`),
    all(`SELECT target, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 AND type = 'article_read' AND target IS NOT NULL
         GROUP BY target ORDER BY visits DESC LIMIT 50`),
    all(`SELECT COALESCE(lang, '?') AS lang, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 AND type = 'pageview' GROUP BY 1 ORDER BY visits DESC LIMIT 20`),
    all(`SELECT COALESCE(country, '?') AS country, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 GROUP BY 1 ORDER BY visits DESC LIMIT 30`),
    all(`SELECT COALESCE(device, '?') AS device, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 GROUP BY 1 ORDER BY visits DESC`),
    all(`SELECT ref, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 AND type = 'pageview' AND ref IS NOT NULL
         GROUP BY ref ORDER BY visits DESC LIMIT 20`),
    all(`SELECT target AS section, COUNT(DISTINCT sid) AS visits FROM events
         WHERE ts >= ?1 AND type = 'section' GROUP BY target`),
    all(`SELECT target, COUNT(*) AS clicks FROM events
         WHERE ts >= ?1 AND type = 'lang' GROUP BY target`),
  ]);

  const visits = totals?.visits || 0;
  const pct = (n, base) => (base ? Math.round((n / base) * 1000) / 10 : 0);
  const pageVisits = scrollBase?.n || 0;
  const reached = (d) => scroll.filter((r) => r.depth >= d).length;
  const readMap = Object.fromEntries(artRead.map((r) => [r.target, r.visits]));
  const sectionMap = Object.fromEntries(sections.map((r) => [r.section, r.visits]));

  return json({
    period_days: days,
    since: new Date(since).toISOString(),
    visits,
    pageviews: totals?.pageviews || 0,
    events: totals?.events || 0,
    top_pages: pages,
    clicks: clicks.filter((r) => !r.target.startsWith("brano:")),
    clicks_tracks: clicks
      .filter((r) => r.target.startsWith("brano:"))
      .map((r) => ({ ...r, target: r.target.slice(6) })),
    scroll_depth_pct: Object.fromEntries(
      [25, 50, 75, 100].map((d) => [d, pct(reached(d), pageVisits)])
    ),
    active_time_seconds: {
      avg_per_visit: Math.round(time?.avg_per_visit || 0),
    },
    articles: {
      opened_total: artOpen.reduce((s, r) => s + r.visits, 0),
      read_to_end_total: artRead.reduce((s, r) => s + r.visits, 0),
      by_article: artOpen.map((r) => ({ article: r.target, opened: r.visits, read_to_end: readMap[r.target] || 0 })),
    },
    languages: langs,
    countries,
    devices,
    referrers: refs,
    sections_seen: Object.fromEntries(
      SECTIONS.map((s) => [s, { visits: sectionMap[s] || 0, pct: pct(sectionMap[s] || 0, visits) }])
    ),
    lang_toggle: langToggle,
  });
}
