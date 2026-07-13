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

