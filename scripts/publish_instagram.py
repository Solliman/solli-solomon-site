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
        print('{\n  "username": "YOUR_INSTAGRAM_USERNAME",\n  "password": "YOUR_INSTAGRAM_PASSWORD"\n}')
        return None, None
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config.get('username'), config.get('password')
    except Exception as e:
        print(f"Error reading credentials file: {e}")
        return None, None

def main():
    parser = argparse.ArgumentParser(description="Publish a photo to Instagram using instagrapi")
    parser.add_argument('--image', required=True, help="Path to the image file (JPG/PNG)")
    parser.add_argument('--caption', required=True, help="Caption text OR path to a text file containing the caption")
    args = parser.parse_args()

    username, password = load_credentials()
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
    session_file = 'instagram_session.json'
    session_loaded = False

    # Attempt to load cached session to avoid frequent login blocks
    if os.path.exists(session_file):
        try:
            cl.load_settings(session_file)
            cl.login(username, password)
            print("Session loaded and logged in successfully.")
            session_loaded = True
        except Exception as e:
            print(f"Could not reuse session settings ({e}). Logging in fresh...")

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
