# Solli Solomon — Storyteller & Memoria Storica del Progetto

Questo documento funge da **memoria storica e registro del flusso di lavoro (workflow)** per il sito ufficiale di Solli Solomon. Raccoglie la visione artistica, le scelte tecniche, le preferenze dell'artista e lo storico delle modifiche per consentire a te o a future intelligenze artificiali di riprendere il lavoro all'istante senza perdere contesto.

---

## 1. Visione Artistica & Fede
*   **Fede in Cristo:** L'artista si definisce e si riconosce semplicemente come **Cristiano**. La sua fede è incentrata su Cristo e sulla Parola, senza legami o etichette con denominazioni specifiche (cattolica, evangelica, ortodossa, ecc.), pur sentendosi vicino alla sensibilità pentecostale.
*   **Musica ed Evangelizzazione:** La musica è concepita come **evangelizzazione musicale** e **preghiera elettronica**. Lo stile unisce un sound design techno scuro, cupo e profondo a temi e canti spirituali (inclusi cori gregoriani e letture bibliche).
*   **Riferimenti e Nicchia:** Artisti come Padre Guilherme o filoni come la *Christian Techno* e la *Techno Worship* sono utilizzati come fari strategici per intercettare un pubblico affine ma senza snaturare l'identità artistica indipendente di Solli Solomon.

---

## 2. Link Utili del Progetto
*   **Sito Ufficiale (Italiano):** [sollisolomon.pages.dev](https://sollisolomon.pages.dev/)
*   **Sito Ufficiale (Inglese):** [sollisolomon.pages.dev/en.html](https://sollisolomon.pages.dev/en.html)
*   **Pagina Link-in-Bio Instagram (Italiano):** [sollisolomon.pages.dev/links.html](https://sollisolomon.pages.dev/links.html)
*   **Pagina Link-in-Bio Instagram (Inglese):** [sollisolomon.pages.dev/en-links.html](https://sollisolomon.pages.dev/en-links.html)
*   **Bandcamp Ufficiale:** [sollisolomon.bandcamp.com](https://sollisolomon.bandcamp.com/)
*   **Spotify Artist Profile:** [open.spotify.com/...](https://open.spotify.com/intl-it/artist/2x5xoFyjt2akRu1zYfcf9X)
*   **YouTube Topic (Tema):** [youtube.com/...](https://youtube.com/channel/UCEs3dfxua348gojTw109OMw?si=9y4FDnALHau2HuM9)
*   **Telegram (Il Cenacolo):** [t.me/...](https://t.me/+TlzorC1zSkY5YzI0)

---

## 3. Preferenze dell'Artista & Linee Guida di Lavoro
*   **No Termini Confessionali:** Evitare nel modo più assoluto termini come "parrocchiale", "chiesa cattolica", "sacerdote" (tranne nei riferimenti esterni a Padre Guilherme) sia all'interno dei testi visibili che invisibili (SEO). Sostituirli con concetti più ampi legati alla fede cristiana.
*   **Fidelizzazione e Controllo:** L'obiettivo primario è portare gli utenti all'ascolto e all'acquisto diretto su **Bandcamp**, seguiti dal contatto diretto su **Telegram (Il Cenacolo)** o tramite il modulo contatti del sito. Piattaforme come Spotify o YouTube sono ritenute secondarie/di distribuzione e non prioritarie nel funnel di contatto.
*   **Strategia di Backup a Scorrimento ("Ieri e Oggi"):** 
    *   Tutte le modifiche stabili vengono salvate localmente nella cartella `backups/`.
    *   I file con suffisso `_today` indicano la versione corrente e funzionante.
    *   I file con suffisso `_yesterday` mantengono la versione precedente stabile (ancora di sicurezza a lungo termine).
*   **Nessuna Modifica in Mobilità (Codice):** L'artista preferisce **non** effettuare modifiche dirette al codice HTML/CSS da dispositivi mobili o dal browser di GitHub per evitare errori di sintassi (che in passato hanno causato schermate nere). Qualsiasi modifica strutturale o di pubblicazione deve essere discussa ed eseguita tramite il PC.

---

## 4. Architettura Tecnica & Scelte di Design
*   **Colori Core (CSS Variables):**
    *   Sfondo (`--bg`): `#07090b` (Nero profondo, techno)
    *   Pannelli (`--surface`): `#0c0f12` (Grigio scuro)
    *   Bordi (`--border`): `#181f24`
    *   Testo (`--text`): `#e2e8e4` (Grigio chiaro caldo)
    *   Accento Principale (`--accent`): `#00c8b4` (Cyan tecnologico/spirituale)
    *   Accento Secondario (`--warm`): `#d4874a` (Oro/Arancione caldo)
*   **Tipografia:** Font *Cormorant Garamond* (serif elegante per titoli) e *DM Mono* (monospaced per dettagli e codici).
*   **Mobile UX Grid (Mostra Altro):**
    *   Su desktop la griglia della discografia mostra tutti i brani.
    *   Su mobile (max-width `767px`), la griglia si contrae nascondendo tutti i brani dal 7° in poi.
    *   Un pulsante outline `.show-more-btn` ("Mostra tutta la discografia (+)") permette di espandere la griglia tramite un trigger JavaScript minimale che rimuove la classe `.collapsed`.
*   **Copertine Discografia:**
    *   Tutte le schede dei brani includono ora l'artwork ufficiale quadrato.
    *   I file locali sono stati eliminati per non appesantire il deposito Git (fatta eccezione per `pastor-cover.jpg` e `promo/pastor_promo_story.jpg`). Le copertine dei vecchi brani sono caricate in streaming sfruttando le CDN di Bandcamp (`https://f4.bcbits.com/img/...`).
    *   Effetto Hover (Desktop): Al passaggio del mouse la copertina appare sfocata sullo sfondo della scheda (`opacity: 0.35`, `filter: grayscale(1) blur(2px)`).

*   **Organizzazione delle Cartelle (Layout Radice):**
    *   `Radice (root)`: Contiene tutti i file attivi del sito web (pagine HTML, fogli di stile CSS, file JS, immagini per il sito, favicon.svg, robots.txt, sitemap.xml).
    *   `backups/`: Contiene le copie di sicurezza locali (`_today.html` e `_yesterday.html`).
    *   `workflow/`: Contiene la memoria storica (`storyteller.md`) e le guide.
    *   `promo/`: Contiene gli asset promozionali per i social (es. l'immagine verticale della storia di Pastor, didascalie pronte per Instagram, immagini originali pesanti).
    *   `scripts/`: Contiene script di automazione (es. lo script Python per caricare i post su Instagram).
    *   *Nota di build:* La cartella principale per il deploy del sito su Cloudflare Pages rimane impostata sulla radice (`/`).

---

## 5. Catalogo Discografico (Memoria Dati)

| N° | Titolo | Dettagli / Collaborazioni | Stato Rilascio | Collegamento Bandcamp / Note |
| :--- | :--- | :--- | :--- | :--- |
| — | **Wept** | Uscita solista strumentale/vocale | In Programmazione (Settembre 2026) | - |
| — | **Vanità** | Uscita solista strumentale/vocale | In Programmazione (Agosto 2026) | - |
| **19** | **Pastor** | Contiene campionamento vocale, player embedded nel sito | Pubblicato il 13 Luglio 2026 | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/pastor) |
| **18** | **Pulsing Waves Remix** | Otus Medi Remix | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/pulsing-waves-solli-solomon-remix) |
| **17** | **Alfa e Omega** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/alfa-e-omega) |
| **16** | **Eleutheria** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/eleutheria) |
| **15** | **Regna** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/regna) |
| **14** | **Vive** | Traccia con campionamento vocale | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/vive) |
| **13** | **Apostolos Remix** | Remix ufficiale | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/apostolos-remix) |
| **12** | **Scoppierà la Musica** | Solli Solomon Remix | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/scoppieral-la-musica) |
| **11** | **Israele** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/israele) |
| **10** | **Apostolos** | Esclusiva Bandcamp | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/apostolos) |
| **09** | **Gerico** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/gerico) |
| **08** | **Call His Name** | Traccia con campionamento vocale | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/call-his-name) |
| **07** | **APOC 13** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/apoc-13) |
| **06** | **Apocalisse** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/apocalisse) |
| **05** | **Tiger Balm** | Traccia solista | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/tiger-balm) |
| **04** | **Lui è il Re** | Feat. Star Bstreet | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/lui-il-re) |
| **03** | **Jss** | Feat. Star Bstreet | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/jss) |
| **02** | **La Musica Cambia** | Feat. Star Bstreet | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/la-musica-cambia) |
| **01** | **Qoelet** | Feat. Star Bstreet (Anno 2019) | Pubblicato | [Bandcamp Link](https://sollisolomon.bandcamp.com/track/qoelet) |

---

## 6. Storico Sostituzioni & Pulizia Codice
*   **notebooklm_linee_guida.md (Spostamento locale):** Rimosso dal server GitHub pubblico per mantenere pulito il sito; spostato in locale nella cartella `backups/`.
*   **Rimozione Immagini Inutilizzate:** Il file `ethos-club-side.jpg` (usato in precedenza come sfondo locale per Pulsing Waves Remix) è stato rimosso per alleggerire il repository. Ora la traccia carica direttamente l'immagine dalla rete.
*   **Pagine Links Proprietarie:** Create `links.html` e `en-links.html` in sostituzione di servizi terzi come Linktree, migliorando il posizionamento SEO del sito e focalizzando l'utente su Bandcamp e Telegram.
