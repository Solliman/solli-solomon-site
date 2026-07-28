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
with open("03 - Meme/calendar.json", encoding="utf-8") as f:
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

    # Se l'orario del post è arrivato (o passato) e non è ancora stato inviato
    if now >= post_dt:
        number = post["number"].zfill(3)
        print(f"📤 Trovato post da inviare: #{number} (programmato per {post['date']} {post['time']})")

        # Cerca l'immagine nei Meme o nelle Promozioni
        imgs = (
            glob.glob(f"03 - Meme/memes_images/meme_{number}*.jpg")
            + glob.glob(f"03 - Meme/memes_images/meme_{number}*.png")
            + glob.glob(f"04 - Promozioni/*/*{number}*.jpg")
        )

        # Cerca la caption nei Meme o nelle Promozioni
        txts = glob.glob(f"03 - Meme/captions/meme_{number}*.txt") + glob.glob(f"04 - Promozioni/*/*{number}*.txt")
        if txts:
            with open(txts[0], encoding="utf-8") as f:
                caption = f.read().strip()
        else:
            caption = f"Meme #{number} 🙏"

        if imgs:
            # Invia foto + caption su Telegram (limite 1024 caratteri per caption di sendPhoto)
            with open(imgs[0], "rb") as f:
                img_bytes = f.read()

            send_caption = caption if len(caption) <= 1000 else f"📸 Meme #{number} — Solli Solomon"

            boundary = "sollibot_boundary_12345"
            body = b""
            for name, value in [("chat_id", CHAT_ID), ("caption", send_caption)]:
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
            try:
                urllib.request.urlopen(req, timeout=30)
                print(f"✅ Immagine + caption inviata su Telegram!")
            except Exception as err:
                print(f"⚠️ Errore invio sendPhoto: {err}")
                # Fallback: invia la foto senza testo e poi invia la caption come messaggio separato
                msg_body = json.dumps({"chat_id": CHAT_ID, "text": f"📸 Meme #{number}\n\n{caption}"}).encode("utf-8")
                req_msg = urllib.request.Request(
                    f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                    data=msg_body,
                    headers={"Content-Type": "application/json"},
                )
                urllib.request.urlopen(req_msg, timeout=30)
                print(f"✅ Caption inviata come messaggio separato su Telegram!")

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
with open("03 - Meme/calendar.json", "w", encoding="utf-8") as f:
    json.dump(calendar, f, indent=2, ensure_ascii=False)
