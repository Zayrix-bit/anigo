import requests
import base64
import time

BASE_URL = "http://localhost:5000/api"

def test_miruro_episodes():
    print("\n--- Testing Miruro Episodes API ---")
    anilist_id = 147105 # Blue Lock
    url = f"{BASE_URL}/miruro/episodes/{anilist_id}"
    try:
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("success"):
            eps = data.get("episodes", [])
            print(f"Success! Found {len(eps)} episodes.")
            if eps:
                # Check first episode for sub/dub providers
                first_ep = eps[0]
                providers = first_ep.get("providers", [])
                sub_count = len([p for p in providers if p.get("category") == "sub"])
                dub_count = len([p for p in providers if p.get("category") == "dub"])
                print(f"Ep 1 Providers: {len(providers)} (Sub: {sub_count}, Dub: {dub_count})")
                return first_ep
        else:
            print(f"Failed: {data.get('error')}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_miruro_stream(ep_id, provider, category):
    print(f"\n--- Testing Miruro Stream API ({category}) ---")
    params = {
        "id": ep_id,
        "provider": provider,
        "anilist_id": 147105,
        "category": category
    }
    try:
        resp = requests.get(f"{BASE_URL}/miruro/stream", params=params)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("success"):
            sources = data.get("sources", [])
            iframe = data.get("iframe_url", "")
            print(f"Success! Found {len(sources)} sources.")
            if iframe:
                print(f"Iframe URL: {iframe[:100]}...")
            if sources:
                print(f"Source 1 Proxy URL: {sources[0].get('proxy_url')[:100]}...")
                return sources[0].get("proxy_url")
        else:
            print(f"Failed: {data.get('error')}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_proxy(proxy_url):
    print("\n--- Testing Proxy API (Manifest) ---")
    try:
        # The proxy_url is absolute (includes localhost:5000)
        resp = requests.get(proxy_url)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Manifest content length:", len(resp.text))
            print("Manifest snippet:", resp.text[:100].replace("\n", " "))
            
            # Now test segment resolution (HLS relative path simulation)
            # If manifest has relative paths, the browser would request /api/proxy/path/to/segment.ts
            # We simulate this by taking a guessed path
            print("\n--- Testing Proxy Segment Resolution (Simulated Relative Path) ---")
            segment_sim_url = "http://localhost:5000/api/proxy/test_segment.ts"
            resp_seg = requests.get(segment_sim_url)
            print(f"Simulated Segment Request Status: {resp_seg.status_code}")
            if resp_seg.status_code == 200:
                print("Success! Proxy correctly resolved the segment path.")
            elif resp_seg.status_code == 404:
                 print("Note: 404 is expected if the segment doesn't exist on the remote server, but 'Proxy context lost' would mean a logic error.")
                 if "Proxy context lost" in resp_seg.text:
                     print("FAILED: Proxy context lost.")
                 else:
                     print("PASS: Proxy tried to fetch but remote returned 404 (Correct behavior for fake segment).")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ep = test_miruro_episodes()
    if ep:
        # Try a SUB provider
        sub_prov = next((p for p in ep["providers"] if p["category"] == "sub"), ep["providers"][0])
        proxy_url = test_miruro_stream(sub_prov["id"], sub_prov["name"], "sub")
        
        # Try a DUB provider if available
        dub_prov = next((p for p in ep["providers"] if p["category"] == "dub"), None)
        if dub_prov:
            test_miruro_stream(dub_prov["id"], dub_prov["name"], "dub")
            
        if proxy_url:
            test_proxy(proxy_url)
