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
el.addEventListener('mouseenter', () => { cur.classList.add('on-button');
ring.classList.add('on-button'); });
el.addEventListener('mouseleave', () => { cur.classList.remove('on-button');
ring.classList.remove('on-button'); });
});
document.addEventListener('mousedown', () => cur.classList.add('clicking'));
document.addEventListener('mouseup', () => cur.classList.remove('clicking'));

// SCROLL HEADER
window.addEventListener('scroll', () =>
document.getElementById('hdr').classList.toggle('scrolled', scrollY > 50)
);

// BANNER
const announceBar = document.getElementById('announce-bar');
const announceClose = document.getElementById('announce-close');
if(announceClose) {
    document.body.classList.add('has-banner');
    announceClose.addEventListener('click', () => {
        announceBar.style.display = 'none';
        document.body.classList.remove('has-banner');
    });
}

// ANIMAZIONI
const obs = new IntersectionObserver(
entries => entries.forEach(e => { if (e.isIntersecting)
e.target.classList.add('visible'); }),
{ threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// FORM CONTATTI
const WEB3FORMS_KEY = '08831c13-61b0-4f7b-98fc-d667390455e7';
document.getElementById('btn-send').addEventListener('click', async () => {
const name    = document.getElementById('f-name').value.trim();
const email   = document.getElementById('f-email').value.trim();
const subject = document.getElementById('f-subject').value.trim();
const msg     = document.getElementById('f-msg').value.trim();
const okEl    = document.getElementById('form-ok');
const errEl   = document.getElementById('form-err');
const btn     = document.getElementById('btn-send');
okEl.className = 'form-msg'; errEl.className = 'form-msg err';
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
subject: subject || 'Contatto dal sito Solli Solomon',
message: msg,
from_name: 'Sito Solli Solomon'
})
});
const data = await res.json();
if (data.success) {
okEl.className = 'form-msg ok';
['f-name','f-email','f-subject','f-msg'].forEach(id =>
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

// MOSTRO ALTRO NELLA DISCOGRAFIA SU MOBILE
const btnShowMore = document.getElementById('btn-show-more');
const musicGrid = document.getElementById('music-grid');
if (btnShowMore && musicGrid) {
    btnShowMore.addEventListener('click', () => {
        musicGrid.classList.remove('collapsed');
        btnShowMore.style.display = 'none';
    });
}



// LOGICA ARTICOLI E RIFLESSIONI (RENDER 4 ALLA VOLTA + READER SYSTEM THEME + PROGRESS BAR)
let currentArticleIndex = 0;
const ARTICLES_PER_PAGE = 4;
const articlesGrid = document.getElementById('articles-grid');
const btnMoreArticles = document.getElementById('btn-more-articles');

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

    const nextBatch = activeArticles.slice(currentArticleIndex, currentArticleIndex + ARTICLES_PER_PAGE);
    const readBtnText = (typeof SOL_ARTICLES_EN !== 'undefined') ? 'Read article' : 'Leggi articolo';
    
    nextBatch.forEach((art, idx) => {
        const globalIdx = currentArticleIndex + idx;
        const card = document.createElement('div');
        card.className = 'article-card reveal visible';

        const thumbHtml = art.img ? `
            <div class="article-card-thumb-wrap">
                <img src="${art.img}" class="article-card-thumb" alt="${art.title}" loading="lazy">
            </div>
        ` : '';

        card.innerHTML = `
            ${thumbHtml}
            <div class="article-date">${art.date}</div>
            <h3 class="article-title">${art.title}</h3>
            <div class="article-author">by ${art.author}</div>
            <div class="article-excerpt">${createExcerpt(art.content)}</div>
            <div class="article-read-btn">${readBtnText} <span>→</span></div>
        `;
        card.addEventListener('click', () => openArticleReader(globalIdx));
        articlesGrid.appendChild(card);
    });

    currentArticleIndex += nextBatch.length;

    if (btnMoreArticles) {
        if (currentArticleIndex >= activeArticles.length) {
            btnMoreArticles.style.display = 'none';
        } else {
            btnMoreArticles.style.display = 'inline-block';
        }
    }
}

if (btnMoreArticles) {
    btnMoreArticles.addEventListener('click', renderArticles);
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
