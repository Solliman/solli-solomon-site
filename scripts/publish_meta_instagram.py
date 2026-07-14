import argparse
import json
import os
import time
import urllib.request
import urllib.parse
import sys

def load_config():
    config_path = 'instagram_meta_config.json'
    if not os.path.exists(config_path):
        print(f"Error: '{config_path}' not found. Please run 'scripts/setup_meta_instagram.py' first.")
        return None
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading config file: {e}")
        return None

def make_post_request(url, params):
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"API Request failed: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        return None

def main():
    parser = argparse.ArgumentParser(description="Publish a photo to Instagram using the official Meta Graph API")
    parser.add_argument('--image_url', required=True, help="Publicly accessible URL of the image (JPG/PNG)")
    parser.add_argument('--caption', required=True, help="Caption text OR path to a local text file with the caption")
    args = parser.parse_args()

    config = load_config()
    if not config:
        sys.exit(1)

    ig_id = config.get('instagram_business_id')
    page_token = config.get('permanent_page_access_token')

    if not ig_id or not page_token:
        print("Invalid configuration in 'instagram_meta_config.json'. Please re-run setup.")
        sys.exit(1)

    # Resolve caption
    caption_text = args.caption
    if os.path.exists(args.caption):
        try:
            with open(args.caption, 'r', encoding='utf-8') as f:
                caption_text = f.read()
        except Exception as e:
            print(f"Error reading caption file: {e}")
            sys.exit(1)

    # Step 1: Create Container
    print(f"Step 1: Creating Instagram media container for image '{args.image_url}'...")
    container_url = f"https://graph.facebook.com/v20.0/{ig_id}/media"
    params = {
        "image_url": args.image_url,
        "caption": caption_text,
        "access_token": page_token
    }
    res = make_post_request(container_url, params)
    if not res or 'id' not in res:
        print("Failed to create media container.")
        sys.exit(1)

    container_id = res['id']
    print(f"Media container created. Container ID: {container_id}")

    # Wait a few seconds for Meta to fetch and process the image from the URL
    print("Waiting 5 seconds for Meta to process the image...")
    time.sleep(5)

    # Step 2: Publish Media
    print("Step 2: Publishing media container...")
    publish_url = f"https://graph.facebook.com/v20.0/{ig_id}/media_publish"
    publish_params = {
        "creation_id": container_id,
        "access_token": page_token
    }
    publish_res = make_post_request(publish_url, publish_params)
    if not publish_res or 'id' not in publish_res:
        print("Failed to publish media.")
        sys.exit(1)

    print(f"🎉 Success! Post officially published on Instagram.")
    print(f"Post ID: {publish_res['id']}")

if __name__ == "__main__":
    main()
