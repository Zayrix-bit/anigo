import requests

BASE = "http://127.0.0.1:5000/api"

def test():
    # 1. Search
    print("Searching for Solo Leveling...")
    resp = requests.get(f"{BASE}/anikai/search", params={"keyword": "Solo Leveling"})
    search_data = resp.json()
    if not search_data.get("results"):
        print("No results found in search.")
        return
    
    slug = search_data["results"][0]["slug"]
    print(f"Found slug: {slug}")
    
    # 2. Info
    print(f"Fetching info for {slug}...")
    resp = requests.get(f"{BASE}/anikai/info/{slug}")
    info_data = resp.json()
    ani_id = info_data.get("ani_id")
    print(f"Ani ID: {ani_id}")
    
    if not ani_id:
        print("No Ani ID found.")
        return
        
    # 3. Episodes
    print(f"Fetching episodes for {ani_id}...")
    resp = requests.get(f"{BASE}/anikai/episodes/{ani_id}")
    eps_data = resp.json()
    episodes = eps_data.get("episodes", [])
    if not episodes:
        print("No episodes found.")
        return
    
    ep_token = episodes[0]["id"]
    print(f"Episode token: {ep_token}")
    
    # 4. Stream
    print(f"Fetching stream for {ep_token}...")
    resp = requests.get(f"{BASE}/anikai/stream/{ep_token}", params={"lang": "sub"})
    print(f"Stream Status: {resp.status_code}")
    print(f"Stream Response: {resp.text}")

if __name__ == "__main__":
    test()
