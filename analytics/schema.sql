-- Eventi di statistica anonima (nessun cookie, nessun IP, nessun user-agent completo).
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,  -- millisecondi epoch (ora del server)
  sid     TEXT    NOT NULL,  -- id casuale di sessione (sessionStorage)
  page    TEXT,              -- percorso, es. /en.html
  lang    TEXT,              -- lingua del browser, es. it
  country TEXT,              -- da request.cf.country
  device  TEXT,              -- mobile | desktop
  ref     TEXT,              -- host del referrer o utm_source
  type    TEXT    NOT NULL,  -- pageview, click, scroll, time, section, ...
  target  TEXT,
  value   REAL
);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_page ON events(page);
