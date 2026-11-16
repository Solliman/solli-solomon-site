// Redirect permanente (301) verso il dominio principale sollisolomon.com.
// Copre il vecchio indirizzo sollisolomon.pages.dev e la variante www.
// Le anteprime dei branch (<hash>.sollisolomon.pages.dev) restano raggiungibili.
const CANONICAL_HOST = "sollisolomon.com";
const REDIRECT_HOSTS = new Set(["sollisolomon.pages.dev", "www.sollisolomon.com"]);
// File di lavoro del repository che non sono pagine del sito: rispondono 404 (controllo del 16/11/2026).
const PRIVATI = /^\/(\.(?!well-known)|06[ %]|analytics\/|workflow\/|functions\/|daily_log|README|wrangler\.toml|CLAUDE|VADEMECUM)/i;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  if (PRIVATI.test(decodeURIComponent(url.pathname))) {
    const pagina = await context.env.ASSETS.fetch(new URL("/404.html", url));
    return new Response(pagina.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return context.next();
}
