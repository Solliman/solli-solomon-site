#!/usr/bin/env python3
"""
Genera feed.xml (RSS 2.0) per la discografia di Solli Solomon a partire
da index.html — stessa fonte di verità usata dal sito, nessun contenuto
duplicato da mantenere a mano.

Uso:
    python3 workflow/generate_feed.py

Legge:  index.html (sezione Discografia + sezione Novità/Prossime Uscite)
Scrive: feed.xml (nella root del repo, servito staticamente da Cloudflare
        Pages come /feed.xml, esattamente come sitemap.xml)

Pensato per girare in una GitHub Action ad ogni push su main che tocchi
index.html (vedi .github/workflows/generate-feed.yml), ma è anche
sicuro da eseguire a mano in locale.
"""
import html
import os
import re
import sys
from datetime import datetime, timezone

SITE_URL = "https://sollisolomon.pages.dev"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML_PATH = os.path.join(REPO_ROOT, "index.html")
FEED_PATH = os.path.join(REPO_ROOT, "feed.xml")

# Stessa logica di estrazione usata dal workflow n8n "Il Cenacolo -
# Uscite Musicali", cosi le due fonti restano coerenti tra loro.
TRACK_RE = re.compile(
    r'<a\s+href="([^"]+)"\s+class="music-card[^"]*"[^>]*>'
    r'(?P<body>.*?)'
    r'<h3 class="music-title">([^<]+)</h3>',
    re.DOTALL,
)
COVER_RE = re.compile(r"background-image:\s*url\('([^']+)'\)")

RELEASE_CARD_RE = re.compile(
    r'<div class="release-card"[^>]*>(?P<body>.*?)</div>\s*(?=<div class="release-card"|</div>\s*</section>)',
    re.DOTALL,
)
RELEASE_TITLE_RE = re.compile(r'<h3 class="release-title">([^<]+)</h3>')
RELEASE_META_RE = re.compile(r'<div class="release-meta"[^>]*>(.*?)</div>', re.DOTALL)
RELEASE_LINK_RE = re.compile(r'<a href="([^"]+)" class="release-listen"')


def strip_tags(text):
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def extract_tracks(index_html):
    tracks = []
    for m in TRACK_RE.finditer(index_html):
        link = m.group(1)
        body = m.group("body")
        title = m.group(3).strip()
        cover_match = COVER_RE.search(body)
        cover = cover_match.group(1) if cover_match else None
        if cover and not cover.startswith("http"):
            cover = f"{SITE_URL}/{cover.lstrip('/')}"
        tracks.append({"title": title, "link": link, "cover": cover})
    return tracks


def extract_release_descriptions(index_html):
    """Descrizioni più ricche dalla sezione 'Novità & Prossime Uscite',
    quando esistono, indicizzate per titolo brano."""
    descriptions = {}
    for m in RELEASE_CARD_RE.finditer(index_html):
        body = m.group("body")
        title_match = RELEASE_TITLE_RE.search(body)
        meta_match = RELEASE_META_RE.search(body)
        if not title_match or not meta_match:
            continue
        title = title_match.group(1).strip()
        descriptions[title] = strip_tags(meta_match.group(1))
    return descriptions


def xml_escape(text):
    return html.escape(text or "", quote=True)


def build_rss(tracks, descriptions):
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
    items_xml = []
    for t in tracks:
        title = xml_escape(t["title"])
        link = xml_escape(t["link"])
        guid = xml_escape(t["link"])
        description = descriptions.get(t["title"]) or (
            f"Ascolta \"{t['title']}\" di Solli Solomon."
        )
        item = ["    <item>"]
        item.append(f"      <title>{title}</title>")
        item.append(f"      <link>{link}</link>")
        item.append(f'      <guid isPermaLink="true">{guid}</guid>')
        item.append(f"      <description><![CDATA[{description}]]></description>")
        if t["cover"]:
            cover_url = xml_escape(t["cover"])
            item.append(
                f'      <enclosure url="{cover_url}" type="image/jpeg"/>'
            )
        item.append("    </item>")
        items_xml.append("\n".join(item))

    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Solli Solomon — Discografia</title>
    <link>{SITE_URL}/</link>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Nuove uscite musicali di Solli Solomon — Christian Techno &amp; Electronic Music.</description>
    <language>it-it</language>
    <lastBuildDate>{now}</lastBuildDate>
{os.linesep.join(items_xml)}
  </channel>
</rss>
"""
    return rss


def main():
    if not os.path.isfile(INDEX_HTML_PATH):
        print(f"Errore: non trovo {INDEX_HTML_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        index_html = f.read()

    tracks = extract_tracks(index_html)
    if not tracks:
        print("Attenzione: nessuna traccia trovata in index.html, feed.xml non generato.", file=sys.stderr)
        sys.exit(1)

    descriptions = extract_release_descriptions(index_html)
    rss = build_rss(tracks, descriptions)

    with open(FEED_PATH, "w", encoding="utf-8") as f:
        f.write(rss)

    print(f"feed.xml generato con {len(tracks)} tracce -> {FEED_PATH}")


if __name__ == "__main__":
    main()
