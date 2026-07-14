import argparse
import json
import urllib.request
import urllib.parse
import sys

def make_request(url, params=None):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"API Request failed: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        return None

def main():
    parser = argparse.ArgumentParser(description="Exchange short-lived Meta token for a permanent Instagram Page token")
    parser.add_argument('--token', required=True, help="Short-lived User Access Token from Graph Explorer")
    parser.add_argument('--app_id', required=True, help="Your Meta App ID")
    parser.add_argument('--app_secret', required=True, help="Your Meta App Secret")
    args = parser.parse_args()

    # Step 1: Exchange short-lived User Token for a Long-Lived User Token (valid for 60 days)
    print("Step 1: Exchanging short-lived user token for a long-lived user token...")
    exchange_url = "https://graph.facebook.com/v20.0/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": args.app_id,
        "client_secret": args.app_secret,
        "fb_exchange_token": args.token
    }
    res = make_request(exchange_url, params)
    if not res or 'access_token' not in res:
        print("Failed to exchange token. Check your App ID, App Secret, and User Token.")
        sys.exit(1)
    
    long_lived_user_token = res['access_token']
    print("Long-lived user token obtained successfully.")

    # Step 2: Get Facebook Pages linked to the user (this returns a permanent Page Token if using long-lived User Token)
    print("\nStep 2: Retrieving linked Facebook Pages...")
    pages_url = "https://graph.facebook.com/v20.0/me/accounts"
    res = make_request(pages_url, {"access_token": long_lived_user_token})
    if not res or 'data' not in res or len(res['data']) == 0:
        print("Failed to retrieve Facebook Pages. Make sure your Facebook user profile manages at least one Page.")
        sys.exit(1)
    
    # We will look for the Page connected to Instagram, or let the user choose.
    # For now, let's list Pages and search for the one with an instagram account.
    pages = res['data']
    selected_page = None
    instagram_business_id = None
    permanent_page_token = None

    print(f"Found {len(pages)} Facebook Page(s):")
    for page in pages:
        page_id = page['id']
        page_name = page['name']
        page_token = page['access_token']
        print(f" - Page: {page_name} (ID: {page_id})")

        # Query to check if this Page has a connected Instagram Business Account
        print(f"   Checking connected Instagram Account for Page '{page_name}'...")
        ig_url = f"https://graph.facebook.com/v20.0/{page_id}"
        ig_res = make_request(ig_url, {
            "fields": "instagram_business_account",
            "access_token": page_token
        })
        if ig_res and 'instagram_business_account' in ig_res:
            ig_account = ig_res['instagram_business_account']
            instagram_business_id = ig_account['id']
            selected_page = page
            permanent_page_token = page_token
            print(f"   ✨ Success! Connected Instagram Account found! (ID: {instagram_business_id})")
            break
        else:
            print("   No connected Instagram Business Account found for this Page.")

    if not selected_page or not instagram_business_id:
        print("\nError: No connected Instagram Business Account found.")
        print("Please verify that your Instagram account is a Creator/Business profile and linked to your Facebook Page in the Page settings.")
        sys.exit(1)

    # Step 3: Write configuration to local JSON file
    config_data = {
        "facebook_page_id": selected_page['id'],
        "facebook_page_name": selected_page['name'],
        "instagram_business_id": instagram_business_id,
        "permanent_page_access_token": permanent_page_token
    }

    config_path = 'instagram_meta_config.json'
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2)
    
    print(f"\n🎉 Configuration successfully saved to '{config_path}'!")
    print("You are now ready to publish automatically using the official Meta API script.")

if __name__ == "__main__":
    main()
