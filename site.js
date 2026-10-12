/* Statistiche anonime first-party: niente cookie, niente IP salvato.
   Invia a /api/e (functions/api/e.js). Rispetta Do Not Track. */
(function () {
  var w = window, d = document, n = navigator;
  if (n.doNotTrack == "1" || w.doNotTrack == "1" || n.globalPrivacyControl || n.webdriver ||
      /bot|crawl|spider|headless|lighthouse/i.test(n.userAgent)) return;

  function r() { return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 20); }
  var id;
  try {
    id = sessionStorage.getItem("_s");
    if (!id) sessionStorage.setItem("_s", id = r());
  } catch (x) { id = r(); }

  var p = location.pathname, b = [];
  function e(type, target, value, extra) {
    var o = { ts: Date.now(), page: p, type: type, target: target || null, value: value == null ? null : value };
    if (extra) for (var k in extra) o[k] = extra[k];
    b.push(o);
    if (b.length >= 20) q();
  }
  function q() {
    while (b.length) {
      var body = JSON.stringify({ sid: id, events: b.splice(0, 20) });
      if (!(n.sendBeacon && n.sendBeacon("/api/e", new Blob([body], { type: "text/plain" })))) {
        fetch("/api/e", { method: "POST", body: body, keepalive: true }).catch(function () {});
      }
    }
  }

  // Apertura pagina: host del referrer esterno (o utm_source) e lingua del browser
  var ref = null;
  try {
    ref = new URLSearchParams(location.search).get("utm_source");
    if (!ref && d.referrer) {
      var rh = new URL(d.referrer).hostname.replace(/^www\./, "");
      if (rh !== location.hostname.replace(/^www\./, "")) ref = rh;
    }
  } catch (x) {}
  e("pageview", null, null, { ref: ref ? ref.slice(0, 100) : null, lang: (n.language || "").slice(0, 12) });

  // Pagina singola di una Riflessione: aperta subito, letta a fine scroll
  var a = /^\/riflessioni\/(?:en-)?([^\/]+?)(?:\.html)?$/.exec(p);
  if (a) e("article_open", a[1]);

  // Click: data-k, link esterni, brani della discografia, cambio lingua
  d.addEventListener("click", function (ev) {
    var el = ev.target.closest && ev.target.closest("a,button,[data-k]");
    if (!el) return;
    if (el.id === "lang-toggle" || el.closest(".lang-switch")) {
      return e("lang", /en/.test(el.getAttribute("href") || "") ? "en" : "it");
    }
    var t = el.getAttribute("data-k");
    if (!t && el.href) {
      var u = new URL(el.href, location.href);
      if (el.classList.contains("disco-track")) t = "brano:" + u.pathname.split("/").filter(Boolean).pop();
      else if (/^https?:$/.test(u.protocol) && u.hostname !== location.hostname) t = u.hostname.replace(/^www\./, "");
    }
    if (t) e("click", t);
  }, true);

  // Profondità di scroll 25/50/75/100, una volta per pagina
  var m = [25, 50, 75, 100], busy = false;
  w.addEventListener("scroll", function () {
    if (busy) return;
    busy = true;
    requestAnimationFrame(function () {
      busy = false;
      var h = d.documentElement.scrollHeight - innerHeight;
      var pct = h > 0 ? (w.scrollY / h) * 100 : 100;
      while (m.length && pct >= m[0] - 2) {
        var v = m.shift();
        e("scroll", null, v);
        if (v === 100 && a) e("article_read", a[1]);
      }
    });
  }, { passive: true });

  // Sezioni viste
  if (w.IntersectionObserver) {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (x) {
        if (x.isIntersecting && (x.intersectionRatio >= 0.25 || x.intersectionRect.height > innerHeight * 0.5)) {
          e("section", x.target.id);
          io.unobserve(x.target);
        }
      });
    }, { threshold: [0, 0.25, 0.5] });
    ["music", "articles", "cenacolo", "contact"].forEach(function (s) {
      var el = d.getElementById(s);
      if (el) io.observe(el);
    });
  }

  // Lettore articoli in-pagina (script.js): aggancia openArticleReader e la barra di progresso
  var cur = null, done = false;
  if (typeof w.openArticleReader === "function") {
    var orig = w.openArticleReader;
    w.openArticleReader = function (i) {
      var res = orig.apply(this, arguments);
      try {
        var art = w.getActiveArticles()[i];
        cur = art ? String(art.slug || art.title).slice(0, 100) : null;
        done = false;
        if (cur) e("article_open", cur);
      } catch (x) {}
      return res;
    };
    var modal = d.getElementById("article-reader-modal"), bar = d.getElementById("reading-progress-bar");
    if (modal && bar) modal.addEventListener("scroll", function () {
      if (cur && !done && parseFloat(bar.style.width) >= 95) { done = true; e("article_read", cur); }
    }, { passive: true });
  }

  // Tempo attivo (solo scheda visibile), inviato a pezzi quando la pagina si nasconde
  var t0 = d.visibilityState === "visible" ? Date.now() : 0;
  function lap() {
    if (t0) {
      var s = Math.round((Date.now() - t0) / 1000);
      if (s > 0) e("time", null, Math.min(s, 21600));
    }
    t0 = 0;
  }
  d.addEventListener("visibilitychange", function () {
    if (d.visibilityState === "hidden") { lap(); q(); }
    else t0 = Date.now();
  });
  w.addEventListener("pagehide", function () { lap(); q(); });
  setInterval(q, 10000);
})();
