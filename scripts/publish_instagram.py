import argparse
import json
import os
import sys

try:
    from instagrapi import Client
except ImportError:
    print("Error: The 'instagrapi' library is not installed.")
    print("Please install it by running: pip install instagrapi")
    sys.exit(1)

def load_credentials():
    config_path = 'instagram_credentials.json'
    if not os.path.exists(config_path):
        print(f"Error: '{config_path}' not found in the root directory.")
        print("Please create this file with the following format:")
        print('{\n  "username": "YOUR_INSTAGRAM_USERNAME",\n  "password": "YOUR_INSTAGRAM_PASSWORD",\n  "sessionid": "OPTIONAL_BROWSER_SESSION_ID"\n}')
        return None, None, None
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config.get('username'), config.get('password'), config.get('sessionid')
    except Exception as e:
        print(f"Error reading credentials file: {e}")
        return None, None, None

def challenge_code_handler(username, choice):
    print(f"\n⚠️ Instagram richiede un codice di verifica (Challenge).")
    print(f"Il codice di 6 cifre è stato inviato tramite: {choice}")
    code = input("👉 Inserisci il codice di 6 cifre qui nel terminale: ")
    return code.strip()

def main():
    parser = argparse.ArgumentParser(description="Publish a photo to Instagram using instagrapi")
    parser.add_argument('--image', required=True, help="Path to the image file (JPG/PNG)")
    parser.add_argument('--caption', required=True, help="Caption text OR path to a text file containing the caption")
    args = parser.parse_args()

    credentials = load_credentials()
    if not credentials:
        sys.exit(1)
    username, password, sessionid = credentials
    if not username or not password:
        sys.exit(1)

    # Resolve caption (if it's a file path, load content)
    caption_text = args.caption
    if os.path.exists(args.caption):
        try:
            with open(args.caption, 'r', encoding='utf-8') as f:
                caption_text = f.read()
        except Exception as e:
            print(f"Error reading caption file: {e}")
            sys.exit(1)

    cl = Client()
    # Imposta il gestore per i codici di verifica (email/SMS)
    cl.challenge_code_handler = challenge_code_handler

    session_file = 'instagram_session.json'
    session_loaded = False

    # 1. Attempt login via browser session ID (highest priority, bypasses block)
    if sessionid:
        try:
            print("Attempting login using browser session ID...")
            cl.login_by_sessionid(sessionid)
            cl.dump_settings(session_file)
            print("Session ID login successful!")
            session_loaded = True
        except Exception as e:
            print(f"Session ID login failed: {e}. Falling back to standard login...")

    # 2. Attempt to load cached session to avoid frequent login blocks
    if not session_loaded and os.path.exists(session_file):
        try:
            cl.load_settings(session_file)
            cl.login(username, password)
            print("Cached session loaded and logged in successfully.")
            session_loaded = True
        except Exception as e:
            print(f"Could not reuse cached session ({e}). Logging in fresh...")

    if not session_loaded:
        try:
            cl.login(username, password)
            cl.dump_settings(session_file)
            print("Logged in successfully. Session cache created.")
        except Exception as e:
            print(f"Login failed: {e}")
            sys.exit(1)

    print(f"Uploading photo '{args.image}' to Instagram...")
    try:
        media = cl.photo_upload(
            path=args.image,
            caption=caption_text
        )
        print("🎉 Success! Post uploaded to Instagram.")
        print(f"Post Link: https://www.instagram.com/p/{media.code}/")
    except Exception as e:
        print(f"Upload failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
