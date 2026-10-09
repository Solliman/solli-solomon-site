// Redirect permanente (301) verso il dominio principale sollisolomon.com.
// Copre il vecchio indirizzo sollisolomon.pages.dev e la variante www.
// Le anteprime dei branch (<hash>.sollisolomon.pages.dev) restano raggiungibili.
const CANONICAL_HOST = "sollisolomon.com";
const REDIRECT_HOSTS = new Set(["sollisolomon.pages.dev", "www.sollisolomon.com"]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
