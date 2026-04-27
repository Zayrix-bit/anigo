import httpx
import json
import base64
import gzip

# Config
BASE_URL = "http://localhost:5000"
TEST_ANILIST_ID = 151807 # Solo Leveling

def test_miruro_integration():
    print(f"\n--- Testing Miruro Backend Integration ---")
    
    # 1. Test Episodes Fetch
    print(f"\n[Step 1] Fetching episodes for AniList ID: {TEST_ANILIST_ID}...")
    try:
        resp = httpx.get(f"{BASE_URL}/api/miruro/episodes/{TEST_ANILIST_ID}", timeout=10.0)
        print(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"FAILED: {resp.text}")
            return
        
        data = resp.json()
        episodes = data.get('episodes', [])
        print(f"Found {len(episodes)} episodes.")
        
        if not episodes:
            print("FAILED: No episodes found.")
            return
            
        first_ep = episodes[0]
        print(f"Testing with Episode {first_ep['number']} (ID: {first_ep['id']}, Provider: {first_ep['provider']})")
        
        # 2. Test Stream Fetch
        print(f"\n[Step 2] Fetching stream for Episode {first_ep['number']}...")
        params = {
            "id": first_ep['id'],
            "provider": first_ep['provider'],
            "anilist_id": TEST_ANILIST_ID
        }
        
        stream_resp = httpx.get(f"{BASE_URL}/api/miruro/stream", params=params, timeout=15.0)
        print(f"Status: {stream_resp.status_code}")
        
        if stream_resp.status_code != 200:
            print(f"FAILED: {stream_resp.text}")
            return
            
        stream_data = stream_resp.json()
        
        # Validation for Frontend requirements
        sources = stream_data.get('sources', [])
        iframe_url = stream_data.get('iframe_url')
        
        print(f"\n[Validation Results]")
        print(f"Success: {stream_data.get('success')}")
        print(f"Sources Found: {len(sources)}")
        if sources:
            for s in sources:
                print(f" - [{s.get('quality', 'unknown')}] {s.get('url')[:60]}...")
        
        print(f"Iframe URL: {iframe_url}")
        
        if not sources and not iframe_url:
            print("\nCRITICAL ERROR: Neither sources nor iframe_url found! Frontend will fail.")
        elif sources and any('.m3u8' in s['url'] for s in sources):
            print("\nSUCCESS: Found direct M3U8 sources! VideoPlayer should work.")
        else:
            print("\nWARNING: No direct M3U8 found, only iframe_url or fallback.")

    except Exception as e:
        print(f"ERROR during test: {e}")

if __name__ == "__main__":
    test_miruro_integration()
