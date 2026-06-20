// ==========================================
// 1. CURSORE E ANIMAZIONI
// ==========================================
const cur = document.getElementById('cursor'); 
const ring = document.getElementById('cring'); 
let mx=0, my=0, rx=0, ry=0; 

document.addEventListener('mousemove', e => { 
    mx = e.clientX; 
    my = e.clientY; 
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

// ==========================================
// 2. SCROLL, BANNER E REVEAL ANIMATIONS
// ==========================================
window.addEventListener('scroll', () => document.getElementById('hdr').classList.toggle('scrolled', scrollY > 50));

const announceBar = document.getElementById('announce-bar'); 
const announceClose = document.getElementById('announce-close'); 
if(announceClose) { 
    document.body.classList.add('has-banner'); 
    announceClose.addEventListener('click', () => { 
        announceBar.style.display = 'none'; 
        document.body.classList.remove('has-banner'); 
    }); 
}

const obs = new IntersectionObserver(entries => entries.forEach(e => { 
    if (e.isIntersecting) e.target.classList.add('visible'); 
}), { threshold: 0.08 }); 
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ==========================================
// 3. FORM CONTATTI E NOTIFICHE (WEB3FORMS)
// ==========================================
const WEB3FORMS_KEY = '08831c13-61b0-4f7b-98fc-d667390455e7'; 

// A. Modulo Contatti Principale
const btnSend = document.getElementById('btn-send');
if(btnSend) {
    btnSend.addEventListener('click', async () => { 
        const name = document.getElementById('f-name').value.trim(); 
        const email = document.getElementById('f-email').value.trim(); 
        const subject = document.getElementById('f-subject').value.trim(); 
        const msg = document.getElementById('f-msg').value.trim(); 
        const okEl = document.getElementById('form-ok'); 
        const errEl = document.getElementById('form-err'); 
        
        okEl.style.display = 'none'; errEl.style.display = 'none';
        if (!name || !email || !msg) { 
            errEl.textContent = '✕ Compila almeno nome, email e messaggio.'; 
            errEl.style.display = 'block'; 
            return; 
        } 
        btnSend.disabled = true; btnSend.textContent = 'Invio in corso...'; 
        
        try { 
            const res = await fetch('https://api.web3forms.com/submit', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
                body: JSON.stringify({ access_key: WEB3FORMS_KEY, name, email, subject: subject || 'Contatto dal sito Solli Solomon', message: msg, from_name: 'Sito Solli Solomon' }) 
            }); 
            const data = await res.json(); 
            if (data.success) { 
                okEl.textContent = '✓ Messaggio inviato con successo!'; okEl.style.display = 'block';
                ['f-name','f-email','f-subject','f-msg'].forEach(id => document.getElementById(id).value = ''); 
            } else { throw new Error('fail'); } 
        } catch { 
            errEl.textContent = '✕ Qualcosa non ha funzionato. Scrivimi su Instagram o Bandcamp.'; errEl.style.display = 'block'; 
        } finally {
            btnSend.textContent = 'Invia messaggio'; btnSend.disabled = false;
        }
    });
}

// B. Notifica Silenziosa Clic "Il Cenacolo"
const btnCenacolo = document.getElementById('btn-cenacolo');
if (btnCenacolo) {
    btnCenacolo.addEventListener('click', () => {
        fetch('https://api.web3forms.com/submit', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
            body: JSON.stringify({ 
                access_key: WEB3FORMS_KEY, 
                name: 'Notifica Sistema', 
                email: 'noreply@sollisolomon.com', 
                subject: '🚨 Nuovo clic su Il Cenacolo! (Sito IT)', 
                message: 'Un utente ha appena cliccato il bottone per entrare nel Cenacolo su Telegram dal tuo sito web in Italiano.', 
                from_name: 'Sito Solli Solomon' 
            }) 
        }).catch(err => console.log('Notifica silente inviata.'));
    });
}
