// Active logging interval tracking
let logInterval = null;
let currentActiveTask = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    checkStatus();
    loadMemes();
    initDiscographyForm();
    
    // Poll status every 5 seconds
    setInterval(checkStatus, 5000);
});

// 1. Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            
            // Toggle buttons
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            // Toggle contents
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });
            
            // Load memes dynamically when opening the tab
            if (tabId === "memes") {
                loadMemes();
            } else if (tabId === "chat-promo") {
                loadChatLogs();
                loadPromos();
            }
        });
    });
}

// 2. Check Service Status
async function checkStatus() {
    try {
        const response = await fetch("/api/status");
        if (!response.ok) throw new Error("Errore API status");
        
        const data = await response.json();
        const indicator = document.getElementById("status-indicator");
        const statusText = document.getElementById("status-text");
        
        if (data.bot_status === "running") {
            indicator.className = "indicator running";
            statusText.innerText = "Telegram Bot: Attivo";
        } else {
            indicator.className = "indicator stopped";
            statusText.innerText = "Telegram Bot: Spento";
        }
        
        // Update task state if running
        updateActiveTasks(data.active_tasks);
        
    } catch (error) {
        console.error("Errore connessione backend:", error);
        const indicator = document.getElementById("status-indicator");
        const statusText = document.getElementById("status-text");
        indicator.className = "indicator stopped";
        statusText.innerText = "Disconnesso";
    }
}

// Update UI depending on running background tasks
function updateActiveTasks(activeTasks) {
    const activeBadge = document.getElementById("active-task-badge");
    
    // Find if there is any running task
    let runningTask = null;
    for (const [task, status] of Object.entries(activeTasks)) {
        if (status === "running") {
            runningTask = task;
            break;
        }
    }
    
    if (runningTask) {
        activeBadge.className = "active-task-badge running";
        activeBadge.innerText = `Esecuzione: ${runningTask}`;
        currentActiveTask = runningTask;
        
        // Start polling logs if not already doing so
        if (!logInterval) {
            logInterval = setInterval(() => pollLogs(runningTask), 1000);
        }
    } else {
        if (currentActiveTask) {
            // Task just finished, poll one last time to capture final log lines
            pollLogs(currentActiveTask);
            currentActiveTask = null;
        }
        
        activeBadge.className = "active-task-badge";
        activeBadge.innerText = "Idle";
        
        if (logInterval) {
            clearInterval(logInterval);
            logInterval = null;
        }
    }
}

// 3. Script Execution
async function runScript(scriptName) {
    const consoleOutput = document.getElementById("console-output");
    consoleOutput.innerText = `>>> Invio comando di avvio per: ${scriptName}...\n`;
    
    try {
        const response = await fetch(`/api/run/${scriptName}`, { method: "POST" });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Errore sconosciuto");
        }
        
        const data = await response.json();
        consoleOutput.innerText += `>>> Task avviato in background con ID: ${data.task_id}\n`;
        
        // Trigger status check immediately
        checkStatus();
        
    } catch (error) {
        consoleOutput.innerText += `\n❌ Errore di avvio: ${error.message}\n`;
    }
}

// Log Polling
async function pollLogs(taskId) {
    try {
        const response = await fetch(`/api/logs/${taskId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        const consoleOutput = document.getElementById("console-output");
        
        consoleOutput.innerText = data.logs || "Avvio in corso...";
        
        // Auto scroll console to bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
    } catch (error) {
        console.error("Errore nel polling dei log:", error);
    }
}

// 4. Meme Gallery Manager
async function loadMemes() {
    const gallery = document.getElementById("meme-gallery");
    
    try {
        const response = await fetch("/api/memes");
        if (!response.ok) throw new Error("Errore nel caricamento dei meme");
        
        const memes = await response.json();
        
        if (memes.length === 0) {
            gallery.innerHTML = '<div class="loading-spinner">Nessun meme trovato nella cartella 03 - Meme.</div>';
            return;
        }
        
        gallery.innerHTML = "";
        
        memes.forEach(meme => {
            const card = document.createElement("div");
            card.className = "meme-card";
            
            // Build absolute path to meme image
            const imgPath = `/repo/03 - Meme/${meme.filename}`;
            const publishedText = meme.published ? "Pubblicato" : "Pronto";
            const publishedClass = meme.published ? "yes" : "no";
            
            card.innerHTML = `
                <div class="meme-img-wrap">
                    <img src="${imgPath}" alt="Meme ${meme.num}" loading="lazy">
                </div>
                <div class="meme-info-wrap">
                    <div class="meme-header-info">
                        <span class="meme-num-badge">#${meme.num}</span>
                        <span class="meme-published-badge ${publishedClass}">${publishedText}</span>
                    </div>
                    <div class="meme-title">${meme.verse}</div>
                    <div class="meme-actions">
                        <button class="btn-secondary" onclick="viewPrompt('${meme.num}')">Vedi Prompt</button>
                        ${!meme.published ? `<button class="btn-primary" onclick="publishMeme('${meme.num}')">Segna Pubblicato</button>` : `<button class="btn-secondary" disabled>Già Pubblicato</button>`}
                    </div>
                </div>
            `;
            gallery.appendChild(card);
        });
        
    } catch (error) {
        gallery.innerHTML = `<div class="loading-spinner" style="color:var(--danger)">Errore: ${error.message}</div>`;
    }
}

// Open Prompt Text Modal
let memesCache = [];
async function viewPrompt(num) {
    try {
        const response = await fetch("/api/memes");
        const memes = await response.json();
        const meme = memes.find(m => m.num === num);
        
        if (meme) {
            document.getElementById("modal-title").innerText = `Prompt Meme #${num} (${meme.verse})`;
            document.getElementById("modal-text").innerText = meme.prompt_text || "Nessun prompt trovato.";
            document.getElementById("prompt-modal").style.display = "flex";
        }
    } catch (error) {
        alert("Errore nel recupero dei dettagli: " + error.message);
    }
}

function closeModal() {
    document.getElementById("prompt-modal").style.display = "none";
}

// Close modal when clicking outside content
window.onclick = function(event) {
    const modal = document.getElementById("prompt-modal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Mark meme as published
async function publishMeme(num) {
    if (!confirm(`Vuoi segnare il meme #${num} come pubblicato? Questa azione modificherà versetti_usati.txt.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/memes/publish/${num}`, { method: "POST" });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Errore nella pubblicazione");
        }
        
        const data = await response.json();
        alert(data.message);
        loadMemes(); // Reload gallery
        
    } catch (error) {
        alert("Errore: " + error.message);
    }
}

// 5. Discography Form handler
function initDiscographyForm() {
    const form = document.getElementById("add-track-form");
    const notification = document.getElementById("form-notification");
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        notification.style.display = "none";
        notification.className = "form-notification";
        
        const num = document.getElementById("track-num").value.trim();
        const title = document.getElementById("track-title").value.trim();
        const collab = document.getElementById("track-collab").value.trim();
        const url = document.getElementById("track-url").value.trim();
        const image_url = document.getElementById("track-image").value.trim();
        const is_coming = document.getElementById("track-coming").checked;
        const release_date = document.getElementById("track-release-date").value.trim();
        
        const payload = {
            num: num.padStart(2, '0'),
            title: title,
            collab: collab,
            url: url,
            image_url: image_url,
            is_coming: is_coming,
            release_date: is_coming ? release_date : ""
        };
        
        try {
            const response = await fetch("/api/discography/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Errore nell'aggiunta della traccia");
            }
            
            const data = await response.json();
            notification.innerText = `✅ Traccia #${num} aggiunta con successo ad index.html ed en.html!`;
            notification.className = "form-notification success";
            form.reset();
            toggleComingFields(); // Reset field visibility
            
        } catch (error) {
            notification.innerText = `✕ Errore: ${error.message}`;
            notification.className = "form-notification error";
        }
    });
}

function toggleComingFields() {
    const isComing = document.getElementById("track-coming").checked;
    const comingFields = document.getElementById("coming-fields");
    const releaseInput = document.getElementById("track-release-date");
    
    if (isComing) {
        comingFields.style.display = "block";
        releaseInput.required = true;
    } else {
        comingFields.style.display = "none";
        releaseInput.required = false;
        releaseInput.value = "";
    }
}

// --- Chat & Promos Logic ---
let chatSessions = [];
let activeSessionIndex = null;
let promosList = [];
let activePromoIndex = 0;
let currentSlideIndex = 0;

// 1. Load Chat Logs
async function loadChatLogs() {
    const sessionListEl = document.getElementById("chat-sessions-list");
    sessionListEl.innerHTML = '<div class="loading-spinner">Caricamento chat...</div>';
    
    try {
        const response = await fetch("/api/chat-logs");
        if (!response.ok) throw new Error("Errore nel caricamento delle chat");
        
        chatSessions = await response.json();
        
        if (chatSessions.length === 0) {
            sessionListEl.innerHTML = '<div class="loading-spinner">Nessun log chat trovato.</div>';
            return;
        }
        
        sessionListEl.innerHTML = "";
        
        // Reverse chatSessions to show most recent sessions first
        const displaySessions = [...chatSessions].reverse();
        
        displaySessions.forEach((session, index) => {
            const button = document.createElement("button");
            button.className = "chat-session-item";
            button.innerText = `📅 ${session.date}`;
            button.onclick = () => selectChatSession(index);
            sessionListEl.appendChild(button);
        });
        
        // Auto-select first session (the most recent one)
        selectChatSession(0);
        
    } catch (error) {
        sessionListEl.innerHTML = `<div class="loading-spinner" style="color:var(--danger)">Errore: ${error.message}</div>`;
    }
}

// 2. Select Chat Session
function selectChatSession(index) {
    activeSessionIndex = index;
    
    // Highlight active session button
    const buttons = document.querySelectorAll(".chat-session-item");
    buttons.forEach((btn, idx) => {
        if (idx === index) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Remember chatSessions was reversed for display, so index maps to:
    const actualIndex = chatSessions.length - 1 - index;
    const session = chatSessions[actualIndex];
    if (!session) return;
    
    // Set chat header
    document.getElementById("chat-messages-header").innerText = `Sessione del ${session.date}`;
    
    // Render messages
    const bodyEl = document.getElementById("chat-messages-body");
    bodyEl.innerHTML = "";
    
    session.messages.forEach(msg => {
        const msgDiv = document.createElement("div");
        const senderClass = msg.sender.toLowerCase().includes("solli") ? "solli" : "antigravity";
        const senderName = msg.sender.toLowerCase().includes("solli") ? "Solli" : "Antigravity";
        
        msgDiv.className = `chat-msg ${senderClass}`;
        
        // Simple escaping for HTML tags inside user text
        const safeText = msg.text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
            
        msgDiv.innerHTML = `
            <div class="chat-bubble">${safeText}</div>
            <div class="chat-meta">${senderName}</div>
        `;
        
        bodyEl.appendChild(msgDiv);
    });
    
    // Scroll body to bottom
    bodyEl.scrollTop = bodyEl.scrollHeight;
}

// 3. Load Promos
async function loadPromos() {
    const selector = document.getElementById("promo-select");
    const contentArea = document.getElementById("promo-content-area");
    
    contentArea.innerHTML = '<div class="loading-spinner">Caricamento promo...</div>';
    
    try {
        const response = await fetch("/api/promos");
        if (!response.ok) throw new Error("Errore nel caricamento delle promozioni");
        
        promosList = await response.json();
        
        if (promosList.length === 0) {
            contentArea.innerHTML = '<div class="loading-spinner">Nessun promo trovato.</div>';
            return;
        }
        
        // Populate select list if empty
        if (selector.options.length === 0) {
            selector.innerHTML = "";
            promosList.forEach((promo, index) => {
                const opt = document.createElement("option");
                opt.value = index;
                opt.innerText = promo.title;
                selector.appendChild(opt);
            });
        }
        
        renderActivePromo();
        
    } catch (error) {
        contentArea.innerHTML = `<div class="loading-spinner" style="color:var(--danger)">Errore: ${error.message}</div>`;
    }
}

// 4. Render Active Promo Details
function renderActivePromo() {
    const contentArea = document.getElementById("promo-content-area");
    const select = document.getElementById("promo-select");
    
    activePromoIndex = parseInt(select.value) || 0;
    const promo = promosList[activePromoIndex];
    if (!promo) return;
    
    currentSlideIndex = 0; // Reset carousel index
    
    // Check if there are slides
    let carouselHtml = "";
    if (promo.slides && promo.slides.length > 0) {
        let slidesDivs = promo.slides.map(src => `<img src="${src}" class="carousel-slide-img" alt="Slide">`).join("");
        let dotsDivs = promo.slides.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`).join("");
        
        carouselHtml = `
            <div class="promo-carousel-wrap">
                <h3>Slide Carosello Instagram</h3>
                <div class="carousel-container">
                    <button class="carousel-arrow prev" onclick="prevSlide()">&lt;</button>
                    <div class="carousel-slides" id="carousel-slides" style="transform: translateX(0px);">
                        ${slidesDivs}
                    </div>
                    <button class="carousel-arrow next" onclick="nextSlide()">&gt;</button>
                </div>
                <div class="carousel-dots" id="carousel-dots">
                    ${dotsDivs}
                </div>
            </div>
        `;
    } else {
        carouselHtml = `
            <div class="promo-carousel-wrap">
                <h3>Slide Carosello</h3>
                <div class="carousel-container">
                    <p style="padding: 32px; color: var(--text-muted); text-align: center; font-size:11px;">Nessuna slide carosello configurata.</p>
                </div>
            </div>
        `;
    }
    
    contentArea.innerHTML = `
        <div class="promo-video-wrap">
            <h3>Reel Video</h3>
            <video id="promo-video-player" controls preload="metadata">
                <source src="${promo.video_url}" type="video/mp4">
                Il tuo browser non supporta la riproduzione video.
            </video>
        </div>
        
        <div class="promo-caption-wrap">
            <div class="caption-header">
                <h3>Didascalia Post</h3>
                <button class="btn-primary btn-copy" onclick="copyPromoCaption()">Copia Testo</button>
            </div>
            <textarea id="promo-caption-text" readonly>${promo.caption}</textarea>
        </div>
        
        ${carouselHtml}
        
        <div class="promo-actions-wrap">
            <h3>Azioni Script</h3>
            <div class="promo-buttons">
                <button class="btn-warm" onclick="runPromoScript('${promo.script_name}')">Rigenera Reel Video</button>
            </div>
        </div>
    `;
}

// Switch promo selector callback
function switchPromo() {
    renderActivePromo();
}

// Carousel navigation
function prevSlide() {
    const promo = promosList[activePromoIndex];
    if (!promo || !promo.slides || promo.slides.length <= 1) return;
    
    currentSlideIndex = (currentSlideIndex - 1 + promo.slides.length) % promo.slides.length;
    updateCarouselOffset();
}

function nextSlide() {
    const promo = promosList[activePromoIndex];
    if (!promo || !promo.slides || promo.slides.length <= 1) return;
    
    currentSlideIndex = (currentSlideIndex + 1) % promo.slides.length;
    updateCarouselOffset();
}

function goToSlide(index) {
    currentSlideIndex = index;
    updateCarouselOffset();
}

function updateCarouselOffset() {
    const slidesEl = document.getElementById("carousel-slides");
    const container = document.querySelector(".carousel-container");
    if (!slidesEl || !container) return;
    
    const width = container.clientWidth;
    slidesEl.style.transform = `translateX(${-currentSlideIndex * width}px)`;
    
    // Update dots
    const dots = document.querySelectorAll(".carousel-dot");
    dots.forEach((dot, index) => {
        if (index === currentSlideIndex) {
            dot.classList.add("active");
        } else {
            dot.classList.remove("active");
        }
    });
}

// Copy caption text
function copyPromoCaption() {
    const textEl = document.getElementById("promo-caption-text");
    if (!textEl) return;
    
    textEl.select();
    textEl.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        navigator.clipboard.writeText(textEl.value);
        const copyBtn = document.querySelector(".btn-copy");
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copiato!";
        copyBtn.style.borderColor = "var(--success)";
        copyBtn.style.color = "var(--success)";
        
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.borderColor = "";
            copyBtn.style.color = "";
        }, 2000);
    } catch (err) {
        alert("Errore nella copia del testo: " + err);
    }
}

// Trigger script run and switch to Automation Tab
function runPromoScript(scriptName) {
    // Switch to automation tab to view logs in console
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    tabBtns.forEach(b => {
        if (b.getAttribute("data-tab") === "automation") {
            b.classList.add("active");
        } else {
            b.classList.remove("active");
        }
    });
    
    tabContents.forEach(c => {
        if (c.id === "automation") {
            c.classList.add("active");
        } else {
            c.classList.remove("active");
        }
    });
    
    // Trigger script run
    runScript(scriptName);
}

// Resize listener to re-align carousel offset
window.addEventListener("resize", () => {
    const tab = document.getElementById("chat-promo");
    if (tab && tab.classList.contains("active")) {
        updateCarouselOffset();
    }
});
