#!/usr/bin/env python3
"""
Solli Post Scheduler
Legge calendar.json e invia il post programmato su Telegram.
Viene eseguito da GitHub Actions ogni 5 minuti.
"""

import json
import os
import glob
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

TOKEN = os.environ["TELEGRAM_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

# Orario italiano (UTC+2 in estate, UTC+1 in inverno)
now = datetime.utcnow() + timedelta(hours=2)
print(f"🕐 Orario attuale (IT): {now.strftime('%d/%m/%Y %H:%M')}")

# Leggi il calendario
with open("workflow/calendar.json", encoding="utf-8") as f:
    calendar = json.load(f)

inviato = False

for post in calendar:
    if post.get("sent"):
        continue

    try:
        post_dt = datetime.strptime(
            f"{post['date']} {post['time']}", "%d/%m/%Y %H:%M"
        )
    except Exception:
        continue

    diff_sec = (now - post_dt).total_seconds()

    # Finestra di 7 minuti (copre il cron ogni 5 min + margine)
    if 0 <= diff_sec <= 420:
        number = post["number"].zfill(3)
        print(f"📤 Trovato post da inviare: Meme #{number}")

        # Cerca l'immagine
        imgs = (
            glob.glob(f"workflow/memes/meme_{number}*.jpg")
            + glob.glob(f"workflow/memes/meme_{number}*.jpeg")
            + glob.glob(f"workflow/memes/meme_{number}*.png")
        )

        # Cerca la caption
        txts = glob.glob(f"workflow/captions/meme_{number}*.txt")
        if txts:
            with open(txts[0], encoding="utf-8") as f:
                caption = f.read().strip()
        else:
            caption = f"Meme #{number} 🙏"

        if imgs:
            # Invia foto + caption su Telegram
            with open(imgs[0], "rb") as f:
                img_bytes = f.read()

            boundary = "sollibot_boundary_12345"
            body = b""
            for name, value in [("chat_id", CHAT_ID), ("caption", caption)]:
                body += (
                    f"--{boundary}\r\n"
                    f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                    f"{value}\r\n"
                ).encode("utf-8")

            body += (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="photo"; filename="meme.jpg"\r\n'
                f"Content-Type: image/jpeg\r\n\r\n"
            ).encode("utf-8")
            body += img_bytes
            body += f"\r\n--{boundary}--\r\n".encode("utf-8")

            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TOKEN}/sendPhoto",
                data=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            )
            urllib.request.urlopen(req, timeout=30)
            print(f"✅ Immagine + caption inviata su Telegram!")

        else:
            # Invia solo testo se l'immagine non c'è
            msg = f"📸 Meme #{number}\n\n{caption}"
            data = json.dumps({"chat_id": CHAT_ID, "text": msg}).encode("utf-8")
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                data=data,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=30)
            print(f"✅ Caption inviata su Telegram (nessuna immagine trovata).")

        # Segna come inviato
        post["sent"] = True
        inviato = True

if not inviato:
    print("ℹ️  Nessun post da inviare in questo momento.")

# Salva il calendario aggiornato
with open("workflow/calendar.json", "w", encoding="utf-8") as f:
    json.dump(calendar, f, indent=2, ensure_ascii=False)
