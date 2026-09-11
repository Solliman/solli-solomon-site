// SCRIPT IL CENACOLO (CON INVIO EMAIL SILENZIOSA)
const btnCenacolo = document.getElementById('btn-cenacolo');
if (btnCenacolo) {
    btnCenacolo.addEventListener('click', () => {
        const WEB3FORMS_KEY = '08831c13-61b0-4f7b-98fc-d667390455e7';
        fetch('https://api.web3forms.com/submit', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
            body: JSON.stringify({ 
                access_key: WEB3FORMS_KEY, 
                name: 'Notifica Sistema', 
                email: 'noreply@sollisolomon.com', 
                subject: '🚨 Nuovo clic su Il Cenacolo!', 
                message: 'Qualcuno ha appena cliccato il bottone per entrare su Telegram dal sito.', 
                from_name: 'Sito Solli Solomon' 
            }) 
        }).catch(err => console.log('Notifica inviata.'));
    });
}

// CURSORE
const cur = document.getElementById('cursor');
const ring = document.getElementById('cring');
let mx=0, my=0, rx=0, ry=0;
if (cur && ring) {
    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
    });
    (function loop() {
        rx += (mx - rx) * 0.1;
        ry += (my - ry) * 0.1;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, input, textarea').forEach(el => {
        el.addEventListener('mouseenter', () => { cur.classList.add('on-button'); ring.classList.add('on-button'); });
        el.addEventListener('mouseleave', () => { cur.classList.remove('on-button'); ring.classList.remove('on-button'); });
    });
    document.addEventListener('mousedown', () => cur.classList.add('clicking'));
    document.addEventListener('mouseup', () => cur.classList.remove('clicking'));
}

// SCROLL HEADER
window.addEventListener('scroll', () =>
document.getElementById('hdr').classList.toggle('scrolled', scrollY > 50)
);

// ANIMAZIONI
const obs = new IntersectionObserver(
entries => entries.forEach(e => { if (e.isIntersecting)
e.target.classList.add('visible'); }),
{ threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// FORM CONTATTI
const WEB3FORMS_KEY = '08831c13-61b0-4f7b-98fc-d667390455e7';
const btnSendEl = document.getElementById('btn-send');
if (btnSendEl) {
btnSendEl.addEventListener('click', async () => {
const name    = document.getElementById('f-name').value.trim();
const email   = document.getElementById('f-email').value.trim();
const msg     = document.getElementById('f-msg').value.trim();
const okEl    = document.getElementById('form-ok');
const errEl   = document.getElementById('form-err');
const btn     = btnSendEl;
okEl.className = 'form-msg'; errEl.className = 'form-msg';
if (!name || !email || !msg) {
errEl.textContent = '✕ Compila almeno nome, email e messaggio.'; errEl.className = 'form-msg err';
return;
}
btn.disabled = true;
btn.textContent = 'Invio in corso...';
try {
const res = await fetch('https://api.web3forms.com/submit', {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
body: JSON.stringify({
access_key: WEB3FORMS_KEY,
name, email,
subject: 'Contatto dal sito Solli Solomon',
message: msg,
from_name: 'Sito Solli Solomon'
})
});
const data = await res.json();
if (data.success) {
okEl.className = 'form-msg ok';
['f-name','f-email','f-msg'].forEach(id =>
document.getElementById(id).value = '');
btn.textContent = 'Invia messaggio';
btn.disabled = false;
} else {
throw new Error('fail');
}
} catch {
errEl.textContent = '✕ Qualcosa non ha funzionato. Scrivimi su Instagram o Bandcamp.';
errEl.className = 'form-msg err';
    btn.textContent = 'Invia messaggio';
    btn.disabled = false;
    }
});
}

// DISCOGRAFIA — paginazione a blocchi di 5, come nel mockup D: "mostra più" e "mostra meno" fianco a fianco
const btnShowMore = document.getElementById('btn-show-more');
const btnShowLess = document.getElementById('btn-show-less');
const musicGrid = document.getElementById('music-grid');
if (btnShowMore && musicGrid) {
    musicGrid.classList.remove('collapsed'); // da qui in poi la visibilità è gestita interamente da JS
    const allTracks = Array.from(musicGrid.children);
    const TRACKS_PAGE_SIZE = 5;
    let visibleTrackCount = Math.min(TRACKS_PAGE_SIZE, allTracks.length);

    function renderTracks() {
        allTracks.forEach((track, i) => {
            track.style.display = i < visibleTrackCount ? 'flex' : 'none';
            track.classList.toggle('is-last-visible', i === visibleTrackCount - 1);
        });
        btnShowMore.style.display = visibleTrackCount >= allTracks.length ? 'none' : 'inline-block';
        if (btnShowLess) {
            btnShowLess.style.display = visibleTrackCount > TRACKS_PAGE_SIZE ? 'inline-block' : 'none';
        }
    }

    btnShowMore.addEventListener('click', () => {
        visibleTrackCount = Math.min(visibleTrackCount + TRACKS_PAGE_SIZE, allTracks.length);
        renderTracks();
    });

    if (btnShowLess) {
        btnShowLess.addEventListener('click', () => {
            visibleTrackCount = Math.max(visibleTrackCount - TRACKS_PAGE_SIZE, TRACKS_PAGE_SIZE);
            renderTracks();
        });
    }

    renderTracks();
}

// LOGICA ARTICOLI E RIFLESSIONI (MOSTRA DI PIÙ / MOSTRA DI MENO A BLOCCHI DI 4 + READER SYSTEM THEME + PROGRESS BAR)
let articleVisibleCount = 0;
const ARTICLES_PER_PAGE = 4;
const articlesGrid = document.getElementById('articles-grid');
const btnMoreArticles = document.getElementById('btn-more-articles');
const btnFewerArticles = document.getElementById('btn-fewer-articles');

const readerModal = document.getElementById('article-reader-modal');
const btnCloseReader = document.getElementById('btn-close-reader');
const progressBar = document.getElementById('reading-progress-bar');
const readerDate = document.getElementById('reader-date');
const readerTitle = document.getElementById('reader-title');
const readerBody = document.getElementById('reader-body');

function createExcerpt(htmlText) {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlText;
    const txt = tmp.textContent || tmp.innerText || '';
    return txt.length > 130 ? txt.substring(0, 130) + '...' : txt;
}

function getActiveArticles() {
    if (typeof SOL_ARTICLES_EN !== 'undefined') return SOL_ARTICLES_EN;
    if (typeof SOL_ARTICLES !== 'undefined') return SOL_ARTICLES;
    return [];
}

function renderArticles() {
    const activeArticles = getActiveArticles();
    if (!activeArticles.length || !articlesGrid) return;

    if (articleVisibleCount === 0) {
        articleVisibleCount = Math.min(ARTICLES_PER_PAGE, activeArticles.length);
    }

    articlesGrid.innerHTML = '';
    const visible = activeArticles.slice(0, articleVisibleCount);

    visible.forEach((art, idx) => {
        const card = document.createElement('div');
        card.className = 'article-card reveal visible';

        const thumbHtml = art.img ? `
            <div class="article-card-thumb-wrap">
                <img src="${art.img}" class="article-card-thumb" alt="${art.title}" loading="lazy">
            </div>
        ` : '';

        card.innerHTML = `
            ${thumbHtml}
            <div class="article-body">
                <div class="article-date">${art.date}</div>
                <h3 class="article-title">${art.title}</h3>
                <div class="article-author">by ${art.author}</div>
            </div>
        `;
        card.addEventListener('click', () => openArticleReader(idx));
        articlesGrid.appendChild(card);
    });

    if (btnMoreArticles) {
        btnMoreArticles.style.display = articleVisibleCount >= activeArticles.length ? 'none' : 'inline-block';
    }
    if (btnFewerArticles) {
        btnFewerArticles.style.display = articleVisibleCount > ARTICLES_PER_PAGE ? 'inline-block' : 'none';
    }
}

if (btnMoreArticles) {
    btnMoreArticles.addEventListener('click', () => {
        const activeArticles = getActiveArticles();
        articleVisibleCount = Math.min(articleVisibleCount + ARTICLES_PER_PAGE, activeArticles.length);
        renderArticles();
    });
}

if (btnFewerArticles) {
    btnFewerArticles.addEventListener('click', () => {
        const activeArticles = getActiveArticles();
        articleVisibleCount = Math.max(articleVisibleCount - ARTICLES_PER_PAGE, Math.min(ARTICLES_PER_PAGE, activeArticles.length));
        renderArticles();
    });
}

// "TUTTI GLI ARTICOLI" nell'header di sezione — carica in un colpo solo tutte le riflessioni
const btnAllArticles = document.getElementById('btn-all-articles');
if (btnAllArticles) {
    btnAllArticles.addEventListener('click', (e) => {
        e.preventDefault();
        const activeArticles = getActiveArticles();
        articleVisibleCount = activeArticles.length;
        renderArticles();
    });
}

// APRE IL READER MODAL
function openArticleReader(index) {
    const activeArticles = getActiveArticles();
    if (!activeArticles.length || !activeArticles[index]) return;
    const art = activeArticles[index];

    const writtenByLabel = (typeof SOL_ARTICLES_EN !== 'undefined') ? 'Written by' : 'Scritto da';

    readerDate.textContent = `${art.date} · by ${art.author}`;
    readerTitle.textContent = art.title;

    const footerSig = `<div class="article-author-footer">✍️ ${writtenByLabel} <strong>${art.author}</strong> · ${art.date}</div>`;
    readerBody.innerHTML = art.content + footerSig;

    readerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    readerModal.scrollTop = 0;
    updateProgressBar();
}

// CHIUDE IL READER MODAL
function closeArticleReader() {
    readerModal.classList.remove('active');
    document.body.style.overflow = '';
}

if (btnCloseReader) {
    btnCloseReader.addEventListener('click', closeArticleReader);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readerModal && readerModal.classList.contains('active')) {
        closeArticleReader();
    }
});

// BARRA DI PROGRESSO LETTURA
function updateProgressBar() {
    if (!readerModal || !progressBar) return;
    const scrollTop = readerModal.scrollTop;
    const scrollHeight = readerModal.scrollHeight - readerModal.clientHeight;
    if (scrollHeight > 0) {
        const pct = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = pct + '%';
    } else {
        progressBar.style.width = '0%';
    }
}

if (readerModal) {
    readerModal.addEventListener('scroll', updateProgressBar);
}

// Inizializza i primi 4 articoli
if (getActiveArticles().length > 0) {
    renderArticles();
}

// ONDA ANIMATA NELL'HERO (onda "a S" fluida, dal mockup D)
const waveCanvas = document.getElementById('waveCanvas');
if (waveCanvas) {
    const ctx = waveCanvas.getContext('2d');
    function resizeWave(){ waveCanvas.width = waveCanvas.offsetWidth; waveCanvas.height = waveCanvas.offsetHeight; }
    resizeWave();
    window.addEventListener('resize', resizeWave);
    let t = 0;
    function drawWave(){
        ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
        const midY = waveCanvas.height * 0.42;
        const amp = waveCanvas.height * 0.09;
        const points = [];
        const steps = 60;
        for(let i=0;i<=steps;i++){
            const x = (waveCanvas.width / steps) * i;
            const y = midY
                + Math.sin(i*0.35 + t) * amp
                + Math.sin(i*0.11 + t*0.6) * amp * 0.5;
            points.push([x,y]);
        }
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for(let i=1;i<points.length-2;i++){
            const xc = (points[i][0] + points[i+1][0]) / 2;
            const yc = (points[i][1] + points[i+1][1]) / 2;
            ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
        }
        const grad = ctx.createLinearGradient(0,0,waveCanvas.width,0);
        grad.addColorStop(0, 'rgba(184,137,63,0)');
        grad.addColorStop(0.5, 'rgba(184,137,63,0.85)');
        grad.addColorStop(1, 'rgba(184,137,63,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // seconda onda più sottile, sfasata, come un'eco
        ctx.beginPath();
        for(let i=0;i<=steps;i++){
            const x = (waveCanvas.width / steps) * i;
            const y = midY + amp*0.6
                + Math.sin(i*0.35 + t + 1.4) * amp * 0.7
                + Math.sin(i*0.11 + t*0.6) * amp * 0.4;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = 'rgba(184,137,63,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        t += 0.012;
        requestAnimationFrame(drawWave);
    }
    drawWave();
}
