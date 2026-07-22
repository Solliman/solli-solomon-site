import os
import re
import glob
import json
import subprocess
import threading
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Antigravity App", description="Web Dashboard per Solli Solomon")

# Paths setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEME_DIR = os.path.join(BASE_DIR, "03 - Meme")
PROMPTS_DIR = os.path.join(MEME_DIR, "01 - prompt_e_versi")
SCRIPTS_DIR = os.path.join(BASE_DIR, "04 - Scripts")
LOGS_DIR = os.path.join(BASE_DIR, "06 - antigravity_app", "logs")

os.makedirs(LOGS_DIR, exist_ok=True)

# Active tasks tracking
active_tasks = {}

class TrackModel(BaseModel):
    num: str
    title: str
    collab: Optional[str] = ""
    url: Optional[str] = ""
    image_url: Optional[str] = ""
    is_coming: bool = False
    release_date: Optional[str] = ""

def run_script_in_background(task_id: str, command: List[str]):
    log_file_path = os.path.join(LOGS_DIR, f"{task_id}.log")
    active_tasks[task_id] = "running"
    try:
        with open(log_file_path, "w", encoding="utf-8") as log_file:
            log_file.write(f"=== Avvio Task: {' '.join(command)} ===\n\n")
            process = subprocess.Popen(
                command,
                cwd=BASE_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            for line in process.stdout:
                log_file.write(line)
                log_file.flush()
            
            process.wait()
            if process.returncode == 0:
                active_tasks[task_id] = "completed"
                log_file.write("\n=== Task completato con successo! ===")
            else:
                active_tasks[task_id] = "failed"
                log_file.write(f"\n=== Task fallito con codice {process.returncode} ===")
    except Exception as e:
        active_tasks[task_id] = "failed"
        with open(log_file_path, "a", encoding="utf-8") as log_file:
            log_file.write(f"\nErrore di esecuzione: {str(e)}")

# Mount static folder
static_dir = os.path.join(BASE_DIR, "06 - antigravity_app", "static")
os.makedirs(static_dir, exist_ok=True)

# API Status
@app.get("/api/status")
def get_status():
    import time
    bot_running = False
    
    # Try reading the status heartbeat file first (works across isolated containers)
    status_file = os.path.join(SCRIPTS_DIR, "02 - telegram_bot", "bot_status.json")
    if os.path.exists(status_file):
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            last_seen = data.get("last_seen", 0)
            # If the bot updated the status file in the last 30 seconds, it is running
            if time.time() - last_seen < 30:
                bot_running = True
        except Exception:
            pass
            
    # Fallback to checking local processes (if they run in the same namespace)
    if not bot_running:
        try:
            res = subprocess.run(["pgrep", "-f", "telegram_bot.py"], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                bot_running = True
        except Exception:
            pass
        
    return {
        "bot_status": "running" if bot_running else "stopped",
        "active_tasks": active_tasks
    }

# API Memes List
@app.get("/api/memes")
def get_memes():
    if not os.path.exists(MEME_DIR):
        return []
        
    # Read versetti_usati.txt to check which ones are published
    published_verses = set()
    tracking_file = os.path.join(PROMPTS_DIR, "versetti_usati.txt")
    if os.path.exists(tracking_file):
        try:
            with open(tracking_file, "r", encoding="utf-8") as f:
                for line in f:
                    if "[PUBBLICATO]" in line:
                        # Extract the verse reference before [PUBBLICATO]
                        parts = line.split("[PUBBLICATO]")
                        published_verses.add(parts[0].strip())
        except Exception:
            pass

    # Find meme jpg files
    meme_files = sorted(glob.glob(os.path.join(MEME_DIR, "meme_*.jpg")))
    memes_list = []
    
    for filepath in meme_files:
        filename = os.path.basename(filepath)
        match = re.search(r"meme_(\d+)_", filename)
        if not match:
            continue
        num = match.group(1)
        
        # Find matching txt file
        txt_matches = glob.glob(os.path.join(PROMPTS_DIR, f"meme_{num}_*.txt"))
        prompt_text = ""
        verse_ref = ""
        is_published = False
        
        if txt_matches:
            try:
                with open(txt_matches[0], "r", encoding="utf-8") as f:
                    prompt_text = f.read()
                    
                # Search for verse ref in txt
                for line in prompt_text.splitlines():
                    if "Testo in basso a destra:" in line:
                        v_match = re.search(r"Testo in basso a destra:\s*([^-\"]+)", line)
                        if v_match:
                            verse_ref = v_match.group(1).strip()
                        break
            except Exception:
                pass
                
        # Check if published
        if verse_ref:
            is_published = any(verse_ref in pub for pub in published_verses)
            
        memes_list.append({
            "num": num,
            "filename": filename,
            "verse": verse_ref or f"Meme #{num}",
            "prompt_text": prompt_text,
            "published": is_published
        })
        
    return memes_list

# API Publish Meme
@app.post("/api/memes/publish/{num}")
def publish_meme(num: str):
    tracking_file = os.path.join(PROMPTS_DIR, "versetti_usati.txt")
    if not os.path.exists(tracking_file):
        raise HTTPException(status_code=404, detail="File versetti_usati.txt non trovato.")
        
    matches = glob.glob(os.path.join(PROMPTS_DIR, f"meme_{num}_*.txt"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"Dettagli meme #{num} non trovati.")
        
    filepath = matches[0]
    verse_ref = ""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("Testo in basso a destra:"):
                    match = re.search(r"Testo in basso a destra:\s*([^-\"]+)", line)
                    if match:
                        verse_ref = match.group(1).strip()
                    break
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella lettura dei dettagli: {str(e)}")
        
    if not verse_ref:
        raise HTTPException(status_code=400, detail="Impossibile estrarre il riferimento del versetto.")
        
    updated = False
    lines = []
    try:
        with open(tracking_file, "r", encoding="utf-8") as f:
            for line in f:
                if verse_ref in line:
                    if "[PUBBLICATO]" not in line:
                        line = line.strip() + " [PUBBLICATO]\n"
                        updated = True
                lines.append(line)
                
        if updated:
            with open(tracking_file, "w", encoding="utf-8") as f:
                f.writelines(lines)
            return {"status": "success", "message": f"Versetto '{verse_ref}' segnato come pubblicato."}
        else:
            return {"status": "already", "message": f"Il versetto '{verse_ref}' è già pubblicato."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella scrittura del file di tracciamento: {str(e)}")

# API Trigger Script Execution
@app.post("/api/run/{script_name}")
def run_script(script_name: str, background_tasks: BackgroundTasks):
    script_map = {
        "compile_memes": ["python3", "04 - Scripts/compile_memes.py"],
        "generate_carousel": ["python3", "04 - Scripts/generate_carousel.py"],
        "generate_pastor_carousel": ["python3", "04 - Scripts/generate_pastor_carousel.py"],
        "generate_promo_reel": ["python3", "04 - Scripts/generate_promo_reel_solli.py"],
        "generate_promo_reel_solli": ["python3", "04 - Scripts/generate_promo_reel_solli.py"],
        "generate_promo_reel_pastor": ["python3", "04 - Scripts/generate_promo_reel_pastor.py"],
        "generate_promo_reel_ripples": ["python3", "04 - Scripts/generate_promo_reel.py"],
        "backup": ["sh", "04 - Scripts/backup_to_nas.sh"]
    }
    
    if script_name not in script_map:
        raise HTTPException(status_code=404, detail="Script non trovato.")
        
    task_id = script_name
    background_tasks.add_task(run_script_in_background, task_id, script_map[script_name])
    return {"status": "started", "task_id": task_id}

# API Get Logs
@app.get("/api/logs/{task_id}")
def get_logs(task_id: str):
    log_file_path = os.path.join(LOGS_DIR, f"{task_id}.log")
    if not os.path.exists(log_file_path):
        return {"status": "not_started", "logs": ""}
        
    try:
        with open(log_file_path, "r", encoding="utf-8") as f:
            logs = f.read()
        return {
            "status": active_tasks.get(task_id, "completed"),
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API Get Chat Logs parsed from markdown
@app.get("/api/chat-logs")
def get_chat_logs():
    chat_log_path = os.path.join(BASE_DIR, "09 - Workflow", "telegram_chat.md")
    if not os.path.exists(chat_log_path):
        return []
        
    sessions = []
    current_session = None
    current_msg = None
    
    try:
        with open(chat_log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        for line in lines:
            stripped = line.strip()
            
            # Match header line (e.g. ### 🗓️ Conversazione del 15/07/2026 22:16:37)
            if stripped.startswith("###") and "Conversazione" in stripped:
                if current_msg and current_session:
                    current_session["messages"].append(current_msg)
                    current_msg = None
                if current_session:
                    sessions.append(current_session)
                
                # Extract date/time
                date_match = re.search(r"Conversazione del\s*([0-9/\s:]+)", stripped)
                date_str = date_match.group(1).strip() if date_match else "Data sconosciuta"
                current_session = {"date": date_str, "messages": []}
                continue
                
            if current_session is None:
                continue
                
            # Match speaker lines
            solli_match = re.match(r"^\*\s+\*\*Solli(?::)?\*\*(?::)?\s*(.*)", stripped)
            anti_match = re.search(r"^\*\s+\*\*Antigravity\s*(?:\([^)]+\))?\s*(?::)?\*\*(?::)?\s*(.*)", stripped)
            
            if solli_match:
                if current_msg:
                    current_session["messages"].append(current_msg)
                current_msg = {"sender": "Solli", "text": solli_match.group(1).strip()}
            elif anti_match:
                if current_msg:
                    current_session["messages"].append(current_msg)
                current_msg = {"sender": "Antigravity", "text": anti_match.group(1).strip()}
            else:
                # Accumulate multi-line paragraphs into current message text
                if current_msg:
                    if stripped:
                        if current_msg["text"]:
                            current_msg["text"] += "\n" + stripped
                        else:
                            current_msg["text"] = stripped
                    elif current_msg["text"]:
                        current_msg["text"] += "\n"
                        
        if current_msg and current_session:
            current_session["messages"].append(current_msg)
        if current_session:
            sessions.append(current_session)
            
        # Strip texts
        for s in sessions:
            for m in s["messages"]:
                m["text"] = m["text"].strip()
                
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel parsing della chat: {str(e)}")

# API Get Songs & Promos data
@app.get("/api/promos")
def get_promos():
    promos = []
    
    # 1. Pulsing Waves
    pulsing_dir = os.path.join(BASE_DIR, "02 - Promozioni", "01 - pulsing_waves")
    pulsing_slides = []
    if os.path.exists(pulsing_dir):
        pulsing_slides = sorted([
            f"/repo/02 - Promozioni/01 - pulsing_waves/{os.path.basename(p)}" 
            for p in glob.glob(os.path.join(pulsing_dir, "pulsing_waves_slide*.jpg"))
        ])
        
    pulsing_caption = (
        "Ridisegnare il suono, scomposizione ed evoluzione. \n"
        "Il remix di Pulsing Waves è fuori ora su tutte le piattaforme. \n\n"
        "🎧 Clicca sul link in bio per ascoltare il brano completo. 🌊🔊\n\n"
        "#christiantechno #technoremix #melodictechno #musicproduction #sollicerelease"
    )
    pulsing_caption_file = os.path.join(pulsing_dir, "pulsing_waves_post.txt")
    if os.path.exists(pulsing_caption_file):
        try:
            with open(pulsing_caption_file, "r", encoding="utf-8") as f:
                pulsing_caption = f.read()
        except Exception:
            pass

    promos.append({
        "id": "pulsing_waves",
        "title": "Pulsing Waves Remix",
        "video_url": "/repo/02 - Promozioni/01 - pulsing_waves/pulsing_waves_solli_reel.mp4",
        "caption": pulsing_caption.strip(),
        "slides": pulsing_slides,
        "script_name": "generate_promo_reel_solli"
    })
    
    # 2. Pastor
    pastor_dir = os.path.join(BASE_DIR, "02 - Promozioni", "02 - pastor")
    pastor_slides = []
    pastor_caption = ""
    if os.path.exists(pastor_dir):
        pastor_slides = sorted([
            f"/repo/02 - Promozioni/02 - pastor/{os.path.basename(p)}" 
            for p in glob.glob(os.path.join(pastor_dir, "pastor_slide*.jpg"))
        ])
        pastor_caption_file = os.path.join(pastor_dir, "pastor_post.txt")
        if os.path.exists(pastor_caption_file):
            try:
                with open(pastor_caption_file, "r", encoding="utf-8") as f:
                    pastor_caption = f.read()
            except Exception:
                pass
                
    if not pastor_caption:
        pastor_caption = (
            "Il suono si fa preghiera, il ritmo si fa cammino. ◈\n"
            "Pastor è fuori ora. \n\n"
            "🎧 Clicca sul link in bio per ascoltare il brano completo e unisciti al Cenacolo su Telegram. ⚡️\n\n"
            "#SolliSolomon #Pastor #ChristianTechno #TechnoWorship #TechnoCristiana #ElectronicPrayer"
        )
        
    promos.append({
        "id": "pastor",
        "title": "Pastor",
        "video_url": "/repo/02 - Promozioni/02 - pastor/pastor_promo_reel.mp4",
        "caption": pastor_caption.strip(),
        "slides": pastor_slides,
        "script_name": "generate_promo_reel_pastor"
    })
    
    return promos

# API Add Discography Track
@app.post("/api/discography/add")
def add_track(track: TrackModel):
    for lang, file_path in [("it", os.path.join(BASE_DIR, "index.html")), ("en", os.path.join(BASE_DIR, "en.html"))]:
        if not os.path.exists(file_path):
            continue
            
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                
            # Create new HTML block based on language and coming status
            if track.is_coming:
                collab_text = track.release_date if track.release_date else ("In arrivo" if lang == "it" else "Coming soon")
                new_block = f"""
            <div class="music-card coming">
                <span class="music-num">— {track.num}</span>
                <h3 class="music-title">{track.title}</h3>
                <span class="music-collab">{collab_text}</span>
            </div>"""
                
                # Insert at the top of coming releases grid
                target = '<div class="music-grid collapsed" id="music-grid">\n            \n            <!-- PROSSIME USCITE -->'
                if target in html_content:
                    html_content = html_content.replace(target, target + new_block)
                else:
                    # Alternative target search
                    target_alt = '<div class="music-grid collapsed" id="music-grid">'
                    html_content = html_content.replace(target_alt, target_alt + "\n" + new_block)
            else:
                collab_info = f'\n                <span class="music-collab">{track.collab}</span>' if track.collab else ""
                collab_class = " collab" if track.collab else ""
                
                img_url = track.image_url if track.image_url else "favicon.svg"
                
                # Setup proper text for "Fuori ora" in IT/EN
                status_text = "Fuori ora" if lang == "it" else "Out now"
                
                new_block = f"""
            <a href="{track.url}" class="music-card{collab_class}" target="_blank" rel="noopener">
                <div class="music-card-bg" style="background-image: url('{img_url}');"></div>
                <img src="{img_url}" class="music-card-thumb" alt="{track.title} Cover" loading="lazy">
                <span class="music-num">— {track.num}</span>
                <h3 class="music-title">{track.title}</h3>{collab_info}
                <span class="music-collab">{status_text}</span>
                <span class="music-arrow">↗</span>
            </a>"""
                
                # Insert after CATALGO comment
                target = "<!-- CATALOGO AGGIORNATO CON PASTOR -->"
                if target in html_content:
                    html_content = html_content.replace(target, target + "\n" + new_block)
                else:
                    # Insert at the beginning of active releases if comment missing
                    # Find the first occurrences of music-card after Coming releases
                    coming_block_end = "<!-- CATALOGO AGGIORNATO CON PASTOR -->"
                    if coming_block_end not in html_content:
                        # Fallback: find the first '<a href' inside music-grid
                        grid_index = html_content.find('id="music-grid"')
                        if grid_index != -1:
                            insert_index = html_content.find('<a href', grid_index)
                            if insert_index != -1:
                                html_content = html_content[:insert_index] + new_block + "\n            " + html_content[insert_index:]
            
            # Save updated HTML
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(html_content)
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore nella modifica di {file_path}: {str(e)}")
            
    return {"status": "success", "message": f"Traccia {track.num} aggiunta con successo!"}

# Serve the entire site repository folder under /repo to access memes, media etc.
app.mount("/repo", StaticFiles(directory=BASE_DIR), name="repo")

# Serve main index.html
@app.get("/")
def read_root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "ready", "message": "Antigravity App Backend attivo. File static/index.html mancante."}

# Mount static files (HTML/CSS/JS)
app.mount("/", StaticFiles(directory=static_dir), name="static")
