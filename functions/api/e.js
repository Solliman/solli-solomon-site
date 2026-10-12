// Raccolta eventi di statistica anonima (first-party, senza cookie).
// Riceve da site.js: {sid, events:[{ts,page,type,target,value,ref,lang}]}
// e salva in D1 (binding DB). NON salva IP né user-agent: dallo UA ricava
// solo mobile/desktop, il paese arriva da request.cf.country.

const MAX_EVENTS = 20;
const MAX_BODY = 8 * 1024;
const TYPES = new Set([
  "pageview", "click", "scroll", "time", "section",
  "article_open", "article_read", "lang",
]);
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|phantom|selenium|puppeteer|playwright/i;
const MOBILE_RE = /Mobi|Android|iPhone|iPad|iPod/i;

function allowedOrigin(origin, reqUrl) {
  if (!origin) return false;
  let u;
  try { u = new URL(origin); } catch { return false; }
  if (u.protocol === "https:" &&
      (u.hostname === "sollisolomon.com" || u.hostname.endsWith(".sollisolomon.pages.dev"))) {
    return true;
  }
  // Sviluppo locale (wrangler pages dev): accettato solo se anche il server è in locale.
  const local = (h) => h === "localhost" || h === "127.0.0.1";
  return local(u.hostname) && local(new URL(reqUrl).hostname);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// Stringa corta e pulita, oppure null.
function str(v, max) {
  if (typeof v !== "string") return null;
  v = v.trim();
  if (!v || v.length > max) return null;
  return /^[\w\-.:\/%@+]+$/.test(v) ? v : null;
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin");
  if (!allowedOrigin(origin, request.url)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  // Origine: header Origin, oppure (se manca) l'host del Referer.
  let origin = request.headers.get("Origin");
  if (!origin) {
    try { origin = new URL(request.headers.get("Referer") || "").origin; } catch { origin = null; }
  }
  if (!allowedOrigin(origin, request.url)) return new Response(null, { status: 403 });
  const headers = corsHeaders(origin);
  const done = () => new Response(null, { status: 204, headers });

  const ua = request.headers.get("User-Agent") || "";
  if (!ua || BOT_RE.test(ua)) return done();

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return new Response(null, { status: 413, headers });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413, headers });

  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400, headers }); }
  const sid = typeof body?.sid === "string" && /^[a-z0-9]{8,32}$/i.test(body.sid) ? body.sid : null;
  const events = Array.isArray(body?.events) ? body.events : null;
  if (!sid || !events || events.length === 0 || events.length > MAX_EVENTS) {
    return new Response(null, { status: 400, headers });
  }

  const now = Date.now();
  const country = str(request.cf?.country, 4);
  const device = MOBILE_RE.test(ua) ? "mobile" : "desktop";
  const rows = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object" || !TYPES.has(ev.type)) continue;
    const page = str(ev.page, 200);
    if (!page || !page.startsWith("/")) continue;
    // Ora del client solo se plausibile (±10 min), altrimenti quella del server.
    const ts = Number.isFinite(ev.ts) && Math.abs(ev.ts - now) < 600000 ? Math.round(ev.ts) : now;
    let value = null;
    if (ev.value != null) {
      if (!Number.isFinite(ev.value) || ev.value < 0 || ev.value > 21600) continue;
      value = ev.value;
    }
    rows.push([
      ts, sid, page,
      str(ev.lang, 12)?.toLowerCase() ?? null,
      country, device,
      str(ev.ref, 100)?.toLowerCase() ?? null,
      ev.type,
      str(ev.target, 100),
      value,
    ]);
  }
  if (!rows.length) return done();

  const stmt = env.DB.prepare(
    "INSERT INTO events (ts, sid, page, lang, country, device, ref, type, target, value) VALUES (?,?,?,?,?,?,?,?,?,?)"
  );
  try {
    await env.DB.batch(rows.map((r) => stmt.bind(...r)));
  } catch (err) {
    console.error("analytics insert failed", err);
  }
  return done();
}

export async function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS" } });
}
