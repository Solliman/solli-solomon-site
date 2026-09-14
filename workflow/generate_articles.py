#!/usr/bin/env python3
"""
Genera una pagina HTML statica per ciascuna Riflessione (articles_data.js /
articles_data_en.js) cosicché ogni articolo abbia un URL proprio, crawlable
e indicizzabile — oggi le Riflessioni si aprono solo in un popup via
JavaScript sulla home, senza nessuna pagina/URL individuale, il che limita
molto l'indicizzazione su Google.

Stessa filosofia del feed brani (generate_feed.py): un'unica fonte di
verità (articles_data.js / articles_data_en.js), nessun contenuto
duplicato a mano.

Uso:
    python3 workflow/generate_articles.py

Legge:   articles_data.js, articles_data_en.js
Scrive:
  - articles_data.js / articles_data_en.js — riscritti con un campo "slug"
    aggiunto a ciascun articolo (usato sia qui che da script.js per
    costruire l'URL della card, unica fonte per lo slug — niente doppia
    logica di slugify in due linguaggi diversi che rischia di disallinearsi)
  - riflessioni/<slug>.html — una pagina per articolo italiano
  - riflessioni/en-<slug>.html — una pagina per articolo inglese
  - feed-riflessioni.xml — RSS con titolo/data/autore/estratto + link a
    ciascuna pagina (solo IT, stessa scelta già fatta per feed.xml)
  - sitemap.xml — rigenerato: le pagine statiche esistenti + tutte le
    pagine di riflessione (IT ed EN)

Pensato per girare in una GitHub Action ad ogni push che tocchi
articles_data.js/articles_data_en.js (vedi
.github/workflows/generate-articles.yml), ma è anche sicuro da eseguire a
mano in locale.
"""
import html
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone

SITE_URL = "https://sollisolomon.pages.dev"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(REPO_ROOT, "riflessioni")
FEED_PATH = os.path.join(REPO_ROOT, "feed-riflessioni.xml")
SITEMAP_PATH = os.path.join(REPO_ROOT, "sitemap.xml")

# Pagine statiche "fisse" del sito, sempre in cima alla sitemap.
STATIC_SITEMAP_ENTRIES = [
    {"loc": f"{SITE_URL}/", "lastmod": "2026-07-23", "priority": "1.0", "changefreq": None},
    {"loc": f"{SITE_URL}/en.html", "lastmod": "2026-07-23", "priority": "0.8", "changefreq": "monthly"},
    {"loc": f"{SITE_URL}/links.html", "lastmod": "2026-07-23", "priority": "0.5", "changefreq": "monthly"},
    {"loc": f"{SITE_URL}/en-links.html", "lastmod": "2026-07-23", "priority": "0.5", "changefreq": "monthly"},
]


def load_articles(path, varname):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read().strip()
    prefix = f"const {varname} ="
    if not text.startswith(prefix):
        print(f"Errore: {path} non inizia con '{prefix}'", file=sys.stderr)
        sys.exit(1)
    body = text[len(prefix):].strip()
    if body.endswith(";"):
        body = body[:-1]
    return json.loads(body)


def save_articles(path, varname, articles):
    body = json.dumps(articles, ensure_ascii=False)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"const {varname} = {body};\n")


def slugify(title):
    text = unicodedata.normalize("NFKD", title)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "articolo"


def assign_slugs(articles):
    """Slug univoco per ciascun articolo della stessa lista (dedup con
    suffisso -2, -3... in caso di titoli che generano lo stesso slug)."""
    seen = {}
    for art in articles:
        base = slugify(art["title"])
        if base not in seen:
            seen[base] = 1
            art["slug"] = base
        else:
            seen[base] += 1
            art["slug"] = f"{base}-{seen[base]}"
    return articles


def strip_tags(text):
    text = re.sub(r"<br\s*/?>", "\n", text)
    # spazio (non stringa vuota) al posto dei tag, altrimenti "the <i>Pharisee</i>
    # who" diventa "thePhariseewho" negli estratti — poi excerpt() comprime
    # gli spazi multipli che questo introduce.
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text).strip()


def excerpt(content_html, max_chars=200):
    text = strip_tags(content_html)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0] + "…"
    return text


def xml_escape(text):
    return html.escape(text or "", quote=True)


ARTICLE_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Solli Solomon</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical_url}">
{hreflang_tags}
<link rel="alternate" type="application/rss+xml" title="Solli Solomon — Riflessioni" href="{site_url}/feed-riflessioni.xml">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical_url}">
<meta property="og:locale" content="{og_locale}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{og_image}">
<script type="application/ld+json">
{json_ld}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<style>
/* Layout minimo per la pagina-articolo singola: riusa le classi/variabili
   di style.css (typography, colori) ma senza il meccanismo di overlay
   fisso, pensato per il popup in-pagina, che qui non serve. */
body {{ cursor: auto; }}
.article-page-header {{
    padding: 20px 24px; display:flex; align-items:center; justify-content:space-between;
    border-bottom: 1px solid var(--border); background: var(--bg);
}}
.article-page-back {{
    background:none; border:none; color:var(--text); font-family:'DM Mono',monospace;
    font-size:11px; letter-spacing:0.2em; text-transform:uppercase; text-decoration:none;
}}
.article-page-back:hover {{ color:var(--accent); }}
.article-page-cover {{ width:100%; max-width:720px; margin:0 auto; display:block; }}
.article-page-footer {{
    max-width:720px; margin:0 auto; padding:0 24px 60px; font-family:'DM Mono',monospace;
    font-size:11px; letter-spacing:0.1em; color:var(--muted);
}}
.article-page-footer a {{ color:var(--accent); text-decoration:none; }}
</style>
</head>
<body>
<header class="article-page-header">
<a href="../{home_page}" class="logo">Solli Solomon</a>
<a href="../{home_page}#articles" class="article-page-back">← {back_label}</a>
</header>
<main class="article-reader-content">
<div class="article-reader-date">{date} · {by_label} {author}</div>
<h1 class="article-reader-title">{title}</h1>
<div class="article-reader-body">{content}</div>
</main>
<div class="article-page-footer">
<p>✍️ {by_label} <strong>{author}</strong> · {date}</p>
<p><a href="../{home_page}#articles">{all_label}</a></p>
</div>
</body>
</html>
"""


def build_article_page(art, lang, alt_slug, home_page):
    is_en = lang == "en"
    canonical_url = f"{SITE_URL}/riflessioni/{'en-' if is_en else ''}{art['slug']}.html"
    alt_it_url = f"{SITE_URL}/riflessioni/{alt_slug}.html" if alt_slug else None
    alt_en_url = f"{SITE_URL}/riflessioni/en-{alt_slug}.html" if alt_slug else None

    hreflang_lines = []
    if alt_slug:
        hreflang_lines.append(f'<link rel="alternate" hreflang="it" href="{alt_it_url if is_en else canonical_url}">')
        hreflang_lines.append(f'<link rel="alternate" hreflang="en" href="{canonical_url if is_en else alt_en_url}">')
    hreflang_tags = "\n".join(hreflang_lines)

    desc = excerpt(art["content"], 190)
    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": art["title"],
        "datePublished": art.get("raw_date", ""),
        "author": {"@type": "Person", "name": art.get("author", "Solli Solomon")},
        "image": art.get("img", ""),
        "publisher": {"@type": "Organization", "name": "Solli Solomon"},
        "mainEntityOfPage": canonical_url,
        "description": desc,
    }, ensure_ascii=False, indent=2)

    return ARTICLE_PAGE_TEMPLATE.format(
        lang=lang,
        title=xml_escape(art["title"]),
        description=xml_escape(desc),
        canonical_url=canonical_url,
        hreflang_tags=hreflang_tags,
        site_url=SITE_URL,
        og_locale="en_US" if is_en else "it_IT",
        og_image=art.get("img") or f"{SITE_URL}/solli-artist.jpg",
        json_ld=json_ld,
        home_page=home_page,
        back_label="Back to reflections" if is_en else "Torna alle riflessioni",
        date=xml_escape(art.get("date", "")),
        by_label="Written by" if is_en else "Scritto da",
        author=xml_escape(art.get("author", "Solli Solomon")),
        content=art["content"],
        all_label="See all reflections →" if is_en else "Tutte le riflessioni →",
    )


def build_feed(articles_it):
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
    items_xml = []
    for art in articles_it:
        title = xml_escape(art["title"])
        link = f"{SITE_URL}/riflessioni/{art['slug']}.html"
        desc = excerpt(art["content"], 300)  # dentro CDATA: niente xml_escape
        pub_date = art.get("raw_date", "")
        try:
            pub_dt = datetime.strptime(pub_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            pub_date_rfc = pub_dt.strftime("%a, %d %b %Y %H:%M:%S %z")
        except ValueError:
            pub_date_rfc = now
        item = ["    <item>"]
        item.append(f"      <title>{title}</title>")
        item.append(f"      <link>{xml_escape(link)}</link>")
        item.append(f'      <guid isPermaLink="true">{xml_escape(link)}</guid>')
        item.append(f"      <pubDate>{pub_date_rfc}</pubDate>")
        item.append(f"      <author>{xml_escape(art.get('author', 'Solli Solomon'))}</author>")
        item.append(f"      <description><![CDATA[{desc}]]></description>")
        if art.get("img"):
            item.append(f'      <enclosure url="{xml_escape(art["img"])}" type="image/jpeg"/>')
        item.append("    </item>")
        items_xml.append("\n".join(item))

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Solli Solomon — Riflessioni &amp; Scritti</title>
    <link>{SITE_URL}/#articles</link>
    <atom:link href="{SITE_URL}/feed-riflessioni.xml" rel="self" type="application/rss+xml"/>
    <description>Riflessioni scritte di Solli Solomon — fede, techno e ricerca.</description>
    <language>it-it</language>
    <lastBuildDate>{now}</lastBuildDate>
{os.linesep.join(items_xml)}
  </channel>
</rss>
"""


def build_sitemap(articles_it, articles_en):
    entries = list(STATIC_SITEMAP_ENTRIES)
    for art in articles_it:
        entries.append({
            "loc": f"{SITE_URL}/riflessioni/{art['slug']}.html",
            "lastmod": art.get("raw_date", ""),
            "priority": "0.6",
            "changefreq": "yearly",
        })
    for art in articles_en:
        entries.append({
            "loc": f"{SITE_URL}/riflessioni/en-{art['slug']}.html",
            "lastmod": art.get("raw_date", ""),
            "priority": "0.5",
            "changefreq": "yearly",
        })

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for e in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{xml_escape(e['loc'])}</loc>")
        if e.get("lastmod"):
            lines.append(f"    <lastmod>{e['lastmod']}</lastmod>")
        if e.get("changefreq"):
            lines.append(f"    <changefreq>{e['changefreq']}</changefreq>")
        lines.append(f"    <priority>{e['priority']}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main():
    it_path = os.path.join(REPO_ROOT, "articles_data.js")
    en_path = os.path.join(REPO_ROOT, "articles_data_en.js")

    articles_it = load_articles(it_path, "SOL_ARTICLES")
    articles_en = load_articles(en_path, "SOL_ARTICLES_EN")

    if not articles_it or not articles_en:
        print("Errore: nessun articolo trovato.", file=sys.stderr)
        sys.exit(1)

    assign_slugs(articles_it)
    assign_slugs(articles_en)

    save_articles(it_path, "SOL_ARTICLES", articles_it)
    save_articles(en_path, "SOL_ARTICLES_EN", articles_en)

    os.makedirs(ARTICLES_DIR, exist_ok=True)

    paired = min(len(articles_it), len(articles_en)) == len(articles_it) == len(articles_en)

    for i, art in enumerate(articles_it):
        alt_slug = articles_en[i]["slug"] if paired else None
        page = build_article_page(art, "it", alt_slug, home_page="index.html")
        out_path = os.path.join(ARTICLES_DIR, f"{art['slug']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)

    for i, art in enumerate(articles_en):
        alt_slug = articles_it[i]["slug"] if paired else None
        page = build_article_page(art, "en", alt_slug, home_page="en.html")
        out_path = os.path.join(ARTICLES_DIR, f"en-{art['slug']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)

    with open(FEED_PATH, "w", encoding="utf-8") as f:
        f.write(build_feed(articles_it))

    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write(build_sitemap(articles_it, articles_en))

    total_pages = len(articles_it) + len(articles_en)
    print(f"Generate {total_pages} pagine ({len(articles_it)} IT + {len(articles_en)} EN) in {ARTICLES_DIR}")
    print(f"feed-riflessioni.xml generato con {len(articles_it)} elementi -> {FEED_PATH}")
    print(f"sitemap.xml rigenerato con {len(STATIC_SITEMAP_ENTRIES) + total_pages} URL -> {SITEMAP_PATH}")


if __name__ == "__main__":
    main()
