

import os
import re
import json as _json
import logging
import difflib
import hashlib
import base64
import gzip
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from bs4 import BeautifulSoup
import requests
import cloudscraper


# ═══════════════════════════════════════════════════════════════════════════════
#  LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

class ColoredFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[94m",
        "INFO": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "CRITICAL": "\033[1;91m",
    }
    RESET = "\033[0m"

    def format(self, record):
        color = self.COLORS.get(record.levelname, "")
        record.msg = f"{color}{record.msg}{self.RESET}"
        return super().format(record)


log = logging.getLogger("anixo")
log.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(ColoredFormatter("[%(asctime)s] %(levelname)s ⚡ %(message)s", datefmt="%H:%M:%S"))
log.addHandler(_handler)


# ═══════════════════════════════════════════════════════════════════════════════
#  HTTP CLIENT — Centralized, replaces all raw requests / AJAX patterns
# ═══════════════════════════════════════════════════════════════════════════════

import httpx
from Crypto.Cipher import AES
import base64

class HttpClient:
    """High-performance HTTP client using httpx."""
    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }

    def __init__(self, timeout=10):
        self.timeout = timeout
        self.client = httpx.Client(http2=True, headers=self.DEFAULT_HEADERS, timeout=timeout, follow_redirects=True)
        log.info("HttpClient initialized with httpx (HTTP/2 enabled)")

    def get(self, url, params=None, headers=None, referer=None, timeout=None):
        h = {**(headers or {})}
        if referer: h["Referer"] = referer
        return self.client.get(url, params=params, headers=h, timeout=timeout or self.timeout)

    def post(self, url, data=None, json=None, headers=None, referer=None, timeout=None):
        h = {**(headers or {})}
        if referer: h["Referer"] = referer
        return self.client.post(url, data=data, json=json, headers=h, timeout=timeout or self.timeout)

    def get_html(self, url, params=None, **kwargs):
        """GET and return response text (HTML)."""
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.text

    def get_json(self, url, params=None, **kwargs):
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def get_soup(self, url, params=None, **kwargs):
        """GET and return parsed BeautifulSoup."""
        html = self.get_html(url, params=params, **kwargs)
        return BeautifulSoup(html, "html.parser")


# Global client instance
http = HttpClient()

# ─── ANILIST & IMAGE PROXY ───────────────────────────────────────────────────

ANILIST_URL = "https://graphql.anilist.co"

def _proxy_img(url: str) -> str:
    """Prepend serveproxy to a URL to prevent ISP blocking/CORS issues."""
    if url and isinstance(url, str) and (url.startswith("http://") or url.startswith("https://")):
        return f"https://serveproxy.com/url?url={url}"
    return url

def _proxy_deep_images(obj):
    """Recursively wrap image URLs in an object with serveproxy."""
    image_keys = {'coverImage', 'bannerImage', 'thumbnail', 'poster', 'image', 'large', 'medium', 'extraLarge'}
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in image_keys and isinstance(value, str) and value.startswith("http"):
                obj[key] = _proxy_img(value)
            elif isinstance(value, (dict, list)):
                _proxy_deep_images(value)
    elif isinstance(obj, list):
        for item in obj:
            _proxy_deep_images(item)
    return obj

def _anilist_query(query: str, variables: dict = None):
    """Execute an AniList GraphQL query."""
    body = {"query": query}
    if variables:
        body["variables"] = variables
    try:
        resp = http.post(ANILIST_URL, json=body)
        return resp.json().get("data", {})
    except Exception as e:
        log.error(f"AniList query failed: {e}")
        return {}

MEDIA_LIST_FIELDS = """
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    genres
    source
    countryOfOrigin
    isAdult
    studios(isMain: true) { nodes { name isAnimationStudio } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
"""

MEDIA_FULL_FIELDS = """
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { large extraLarge color }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags { name rank isMediaSpoiler }
    source
    countryOfOrigin
    isAdult
    hashtag
    synonyms
    siteUrl
    trailer { id site thumbnail }
    studios { nodes { id name isAnimationStudio siteUrl } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
            voiceActors(language: JAPANESE) { id name { full native } image { large } languageV2 }
        }
    }
    staff(sort: RELEVANCE, perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
        }
    }
    relations {
        edges {
            relationType(version: 2)
            node {
                id
                title { romaji english native }
                coverImage { large }
                format
                type
                status
                episodes
                meanScore
            }
        }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
            rating
            mediaRecommendation {
                id
                title { romaji english native }
                coverImage { large }
                format
                episodes
                status
                meanScore
                averageScore
            }
        }
    }
    externalLinks { url site type }
    streamingEpisodes { title thumbnail url site }
"""



app = Flask(__name__)
CORS(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER: In-memory TTL cache (replaces lru_cache on mutable dicts)
# ═══════════════════════════════════════════════════════════════════════════════

import time

_cache = {}
CACHE_TTL = 300  # 5 minutes


def cached(prefix, ttl=CACHE_TTL):
    """Decorator for caching function results with TTL."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"{prefix}:{args}:{kwargs}"
            entry = _cache.get(key)
            if entry and (time.time() - entry["ts"]) < ttl:
                return entry["data"]
            result = fn(*args, **kwargs)
            _cache[key] = {"data": result, "ts": time.time()}
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER: Standard API response wrapper
# ═══════════════════════════════════════════════════════════════════════════════

def api_response(fn):
    """Decorator that wraps route handlers with consistent error handling and caching."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            if isinstance(result, tuple):
                data, code = result
                resp = jsonify({"success": True, **data}) if isinstance(data, dict) else jsonify(data)
                # Add browser caching for successful GET requests (1 hour)
                if request.method == "GET" and code == 200:
                    resp.headers["Cache-Control"] = "public, max-age=300"
                return resp, code
            
            resp = jsonify({"success": True, **result})
            if request.method == "GET":
                resp.headers["Cache-Control"] = "public, max-age=300"
            return resp
        except requests.exceptions.RequestException as e:
            log.error("Network error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": f"Network error: {e}"}), 502
        except Exception as e:
            log.error("Error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": str(e)}), 500
    wrapper.__name__ = fn.__name__
    return wrapper


class GogoanimeScraper:
    """Gogoanime (gogoanimes.cv) scraper — search and episode IDs."""

    BASE = "https://gogoanimes.cv"

    @cached("gogoanime:recent", ttl=300)
    def get_recent_episodes(self, type="dub", limit=24, page=1):
        """Fetch recently updated episodes with true pagination support."""
        results = []
        try:
            url = f"{self.BASE}/sub-category/dub-anime?page={page}" # Gogoanime uses /sub-category/dub-anime?page={page} for dubbed anime
            html = http.get_html(url)
            soup = BeautifulSoup(html, "html.parser")
            
            # Extract pagination info
            last_page = page
            pagination = soup.select_one("div.anime_name.new_series > div.pagination")
            if pagination:
                pages = pagination.select("ul li a")
                for p in pages:
                    href = p.get("href", "")
                    if "page=" in href:
                        try:
                            p_num = int(href.split("page=")[-1].split("&")[0])
                            if p_num > last_page:
                                last_page = p_num
                        except:
                            continue
            
            items = soup.select("div.last_episodes ul.items li")
            for item in items:
                title_tag = item.select_one("p.name a")
                poster_img = item.select_one("div.img a img")
                
                if not title_tag:
                    continue
                
                title_text = title_tag.get_text(strip=True)
                
                href = title_tag.get("href", "").rstrip("/")
                slug = href.split("/")[-1]
                
                results.append({
                    "id": slug,
                    "title": {
                        "romaji": title_text,
                        "english": title_text
                    },
                    "coverImage": {
                        "large": poster_img.get("src") if poster_img else "",
                        "extraLarge": poster_img.get("src") if poster_img else ""
                    },
                    "episodes": item.select_one("p.reaslead").get_text(strip=True).replace("Episode: ", "") if item.select_one("p.reaslead") else "?",
                    "format": "TV", # Default to TV
                    "status": "RELEASING" # Default to RELEASING
                })
            
            return {"results": results[:limit], "pageInfo": {"lastPage": page + 1, "currentPage": page, "hasNextPage": len(results) == limit}}
        except Exception as e:
            log.error("Gogoanime: Page %s fetch failed: %s", page, e)
            return {"results": [], "pageInfo": {"lastPage": page, "currentPage": page, "hasNextPage": False}}

    @cached("gogoanime:search", ttl=300)
    def search(self, keyword):
        """Search and return all potential matches."""
        try:
            # Gogoanime search usually uses ?s=keyword
            html = http.get_html(f"{self.BASE}/", params={"s": keyword})
            soup = BeautifulSoup(html, "html.parser")
            
            results = []
            items = soup.select("div.last_episodes ul.items li")
            
            for item in items:
                title_tag = item.select_one("p.name a")
                if not title_tag:
                    continue
                
                title = title_tag.get_text(strip=True)
                href = title_tag.get("href", "")
                # Extract slug from URL: https://gogoanimes.cv/anime/slug/ or https://gogoanimes.cv/slug/
                slug = href.rstrip("/").split("/")[-1]
                if "-episode-" in slug:
                    slug = slug.split("-episode-")[0]
                
                results.append({
                    "title": title,
                    "slug": slug,
                    "source": "gogoanime"
                })
            
            return results
        except Exception as e:
            log.error("Gogoanime search failed: %s", e)
            return []

    @cached("gogoanime:episodes", ttl=1800)
    def get_episodes(self, gogoanime_id):
        """Extract episode list from Gogoanime page."""
        try:
            # Gogoanime usually lists episodes in a specific format or via AJAX
            # For simplicity, if we can't find a list, we'll return an empty one
            # and let the frontend fallback to AniList episode counts.
            url = f"{self.BASE}/anime/{gogoanime_id}/"
            html = http.get_html(url)
            soup = BeautifulSoup(html, "html.parser")
            
            # Gogoanime often uses an 'ep_start' and 'ep_end' pattern in their JS or HTML
            # Let's try to find the total number of episodes
            ep_list = []
            
            # Pattern 1: div.anime_video_body_ul ul li
            items = soup.select(".anime_video_body_ul ul li")
            for item in items:
                link = item.select_one("a")
                if link:
                    title = link.get_text(strip=True)
                    ep_num_match = re.search(r'Episode (\d+)', title)
                    if ep_num_match:
                        ep_list.append({
                            "number": int(ep_num_match.group(1)),
                            "id": link.get("href", "").rstrip("/").split("/")[-1]
                        })
            
            return sorted(ep_list, key=lambda x: x["number"])
        except Exception as e:
            log.error(f"Gogoanime get_episodes Error: {e}")
            return []

    @cached("gogoanime:info", ttl=1800)
    def get_info(self, slug):
        log.info(f"Gogoanime: Fetching info for slug: {slug}")
        try:
            # Try to get info page
            url = f"{self.BASE}/anime/{slug}/"
            log.info(f"Gogoanime: Trying URL: {url}")
            try:
                html = http.get_html(url)
            except Exception as e:
                url = f"{self.BASE}/{slug}/"
                log.info(f"Gogoanime: Primary URL failed, trying: {url}")
                html = http.get_html(url)
                
            soup = BeautifulSoup(html, "html.parser")
            
            title_tag = soup.select_one("h1") or soup.select_one(".anime_info_body_bg h1")
            title = title_tag.get_text(strip=True) if title_tag else slug
            log.info(f"Gogoanime: Found title: {title}")
            
            # Clean title (remove (Dub), (2025), etc.)
            clean_title = re.sub(r'\(Dub\)|\(\d{4}\)', '', title).strip()
            
            info = {
                "title": title,
                "clean_title": clean_title,
                "slug": slug,
                "description": "",
            }
            
            return info
        except Exception as e:
            log.error(f"Gogoanime get_info Error: {e}")
            return None

    def resolve_to_anilist(self, slug):
        """Resolve a Gogoanime slug to an AniList ID."""
        info = self.get_info(slug)
        if not info or not info.get("clean_title"):
            return None
            
        title = info["clean_title"]
        log.info(f"Resolving Gogoanime slug '{slug}' (Title: {title}) to AniList...")
        
        # Search AniList via our proxy
        search_query = """
        query ($search: String) {
          Page(page: 1, perPage: 5) {
            media(search: $search, type: ANIME) {
              id
              title { romaji english native }
            }
          }
        }
        """
        try:
            resp = http.post(
                "https://graphql.anilist.co",
                json={"query": search_query, "variables": {"search": title}},
                headers={"Content-Type": "application/json"}
            )
            data = resp.json()
            results = data.get("data", {}).get("Page", {}).get("media", [])
            
            if not results:
                return None
                
            # Best match logic
            best_match = results[0] # Default to first result
            
            # Try to find a better match using difflib
            titles = []
            for r in results:
                titles.extend([
                    r["title"].get("romaji", ""),
                    r["title"].get("english", ""),
                    r["title"].get("native", "")
                ])
            
            # Filter empty titles
            titles = [t for t in titles if t]
            
            matches = difflib.get_close_matches(title, titles, n=1, cutoff=0.6)
            if matches:
                matched_title = matches[0]
                for r in results:
                    if matched_title in [r["title"].get("romaji"), r["title"].get("english"), r["title"].get("native")]:
                        best_match = r
                        break
            
            log.info(f"Resolved Gogoanime '{slug}' -> AniList ID: {best_match['id']}")
            return {"anilist_id": best_match["id"], "title": best_match["title"]}
            
        except Exception as e:
            log.error(f"Gogoanime resolution failed: {e}")
            return None

class KitsuScraper:
    """Kitsu.io API for high-quality episode thumbnails and metadata."""
    API = "https://kitsu.io/api/edge"

    @cached("kitsu:episodes", ttl=86400)
    def get_episode_meta(self, title=None, alt_title=None, kitsu_id=None):
        try:
            target_id = kitsu_id
            
            # 1. If no ID provide, search for anime
            if not target_id:
                titles_to_try = [t for t in [title, alt_title] if t]
                for t in titles_to_try:
                    search_data = http.get_json(f"{self.API}/anime", params={"filter[text]": t})
                    if search_data.get("data"):
                        target_id = search_data["data"][0]["id"]
                        log.info(f"Kitsu: Found anime '{t}' with ID {target_id}")
                        break
            
            if not target_id:
                return {}
            
            # 2. Fetch episodes
            ep_meta = {}
            for offset in range(0, 400, 20):
                ep_data = http.get_json(f"{self.API}/episodes", params={
                    "filter[mediaId]": target_id,
                    "page[limit]": 20,
                    "page[offset]": offset,
                    "sort": "number"
                })
                
                if not ep_data.get("data"):
                    break
                
                for ep in ep_data["data"]:
                    attr = ep["attributes"]
                    num = attr.get("number")
                    if num is None: continue
                    
                    num_key = str(num)
                    # Get high-res original thumbnail
                    img = None
                    if attr.get("thumbnail"):
                        thumb = attr["thumbnail"]
                        img = thumb.get("original") or thumb.get("large") or thumb.get("medium")
                    
                    ep_meta[num_key] = {
                        "title": attr.get("canonicalTitle") or attr.get("titles", {}).get("en_us"),
                        "description": attr.get("synopsis"),
                        "image": img
                    }
                
                if len(ep_data["data"]) < 20:
                    break
                    
            return ep_meta
        except Exception as e:
            log.error(f"Kitsu Metadata Error: {e}")
            return {}

# ═══════════════════════════════════════════════════════════════════════════════
#  MIRURO SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class MiruroScraper:
    PIPE_URL = "https://www.miruro.to/api/secure/pipe"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Referer": "https://www.miruro.to/",
        "Origin": "https://www.miruro.to",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9"
    }

    def _encode_pipe_request(self, payload: dict) -> str:
        return base64.urlsafe_b64encode(_json.dumps(payload).encode()).decode().rstrip('=')

    def _decode_pipe_response(self, encoded_str: str) -> dict:
        try:
            encoded_str += '=' * (4 - len(encoded_str) % 4)
            compressed = base64.urlsafe_b64decode(encoded_str)
            return _json.loads(gzip.decompress(compressed).decode('utf-8'))
        except Exception as e:
            log.error(f"Miruro decode error: {e}")
            return {}

    def get_episodes(self, anilist_id: int):
        payload = {
            "path": "episodes",
            "method": "GET",
            "query": {"anilistId": int(anilist_id)},
            "body": None,
            "version": "0.1.0",
        }
        encoded_req = self._encode_pipe_request(payload)
        try:
            data = http.get_json(f"{self.PIPE_URL}?e={encoded_req}", headers=self.HEADERS)
            return self._decode_pipe_response(data.get("result", "") if isinstance(data, dict) else "") if not data else self._decode_pipe_response(http.get_html(f"{self.PIPE_URL}?e={encoded_req}", headers=self.HEADERS))
        except Exception as e:
            html = http.get_html(f"{self.PIPE_URL}?e={encoded_req}", headers=self.HEADERS)
            return self._decode_pipe_response(html)

    def get_sources(self, ep_id: str, provider: str, anilist_id: int, category: str = "sub"):
        payload = {
            "path": "sources",
            "method": "GET",
            "query": {
                "episodeId": ep_id,
                "provider": provider,
                "category": category,
                "anilistId": int(anilist_id),
            },
            "body": None,
            "version": "0.1.0",
        }
        encoded_req = self._encode_pipe_request(payload)
        try:
            html = http.get_html(f"{self.PIPE_URL}?e={encoded_req}", headers=self.HEADERS)
            return self._decode_pipe_response(html)
        except Exception as e:
            log.error(f"Miruro sources error: {e}")
            return {}


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANTIATE SCRAPERS
# ═══════════════════════════════════════════════════════════════════════════════

gogoanime = GogoanimeScraper()
kitsu = KitsuScraper()
miruro = MiruroScraper()


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Core
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
@app.route("/api", methods=["GET"])
def index():
    return jsonify({
        "success": True,
        "api": "Anigo Unified Miruro-Core API",
        "status": "online",
        "version": "4.0.0",
        "engines": ["miruro (primary)", "anilist (meta)"],
        "endpoints": {
            "/api/trending": "Trending anime from AniList",
            "/api/popular": "Most popular anime",
            "/api/recent": "Recently airing episodes",
            "/api/upcoming": "Anticipated upcoming anime",
            "/api/spotlight": "Curated spotlight list",
            "/api/search?query=": "Full AniList metadata search",
            "/api/info/<anilist_id>": "Complete anime details",
            "/api/miruro/episodes/<anilist_id>": "Miruro direct stream mappings",
            "/api/miruro/stream": "Miruro video source extractor",
            "/api/proxy?url=": "CORS/ISP bypass for media streams"
        },
    })


@app.route("/api/python/resolve/<slug>", methods=["GET"])
@api_response
def api_python_resolve(slug):
    # Fallback to Gogoanime resolution
    result = gogoanime.resolve_to_anilist(slug)
    if result:
        return result
        
    return {"error": "Failed to resolve slug to AniList ID"}, 404


@app.route("/api/meta/episodes", methods=["GET"])
@api_response
def api_meta_episodes():
    title = request.args.get("title", "").strip()
    alt_title = request.args.get("alt_title", "").strip()
    kitsu_id = request.args.get("kitsu_id", "").strip()
    
    if not title and not kitsu_id:
        return {"error": "Title or kitsu_id required"}, 400
        
    return kitsu.get_episode_meta(title=title, alt_title=alt_title, kitsu_id=kitsu_id)








# Duplicate route removed — already defined at line 1100 as api_python_resolve()


async def _fetch_collection(sort_type: str, status: str = None, page: int = 1, per_page: int = 24):
    """Internal helper for fetching collections like trending, popular, etc."""
    status_filter = f", status: {status}" if status else ""
    gql = f"""
    query ($page: Int, $perPage: Int) {{
        Page(page: $page, perPage: $perPage) {{
            pageInfo {{ total currentPage lastPage hasNextPage perPage }}
            media(type: ANIME, sort: [{sort_type}]{status_filter}) {{
                {MEDIA_LIST_FIELDS}
            }}
        }}
    }}
    """
    data = _anilist_query(gql, {"page": page, "perPage": per_page})
    page_data = data.get("Page", {})
    page_info = page_data.get("pageInfo", {})
    response = {
        "media": page_data.get("media", []),
        "pageInfo": {
            "total": page_info.get("total", 0),
            "currentPage": page_info.get("currentPage", page),
            "lastPage": page_info.get("lastPage", 1),
            "hasNextPage": page_info.get("hasNextPage", False),
            "perPage": page_info.get("perPage", per_page),
        }
    }
    return _proxy_deep_images(response)

@app.route("/api/trending", methods=["GET"])
@api_response
def api_trending():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 24, type=int)
    return _fetch_collection("TRENDING_DESC", page=page, per_page=limit)

@app.route("/api/popular", methods=["GET"])
@api_response
def api_popular():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 24, type=int)
    return _fetch_collection("POPULARITY_DESC", page=page, per_page=limit)

@app.route("/api/recent", methods=["GET"])
@api_response
def api_recent():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 24, type=int)
    return _fetch_collection("START_DATE_DESC", "RELEASING", page=page, per_page=limit)

@app.route("/api/upcoming", methods=["GET"])
@api_response
def api_upcoming():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 24, type=int)
    return _fetch_collection("POPULARITY_DESC", "NOT_YET_RELEASED", page=page, per_page=limit)

@app.route("/api/spotlight", methods=["GET"])
@api_response
def api_spotlight():
    gql = f"""
    query {{
        Page(page: 1, perPage: 10) {{
            media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME) {{
                {MEDIA_LIST_FIELDS}
            }}
        }}
    }}
    """
    data = _anilist_query(gql)
    media = data.get("Page", {}).get("media", [])
    return _proxy_deep_images({"media": media})

@app.route("/api/search", methods=["GET"])
@api_response
def api_search():
    query = request.args.get("query", "").strip()
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 24, type=int)
    
    if not query:
        return {"error": "Query required"}, 400
        
    gql = f"""
    query ($search: String, $page: Int, $perPage: Int) {{
        Page(page: $page, perPage: $perPage) {{
            pageInfo {{ total currentPage lastPage hasNextPage perPage }}
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {{
                {MEDIA_LIST_FIELDS}
            }}
        }}
    }}
    """
    data = _anilist_query(gql, {"search": query, "page": page, "perPage": limit})
    page_data = data.get("Page", {})
    page_info = page_data.get("pageInfo", {})
    response = {
        "media": page_data.get("media", []),
        "pageInfo": {
            "total": page_info.get("total", 0),
            "currentPage": page_info.get("currentPage", page),
            "lastPage": page_info.get("lastPage", 1),
            "hasNextPage": page_info.get("hasNextPage", False),
            "perPage": page_info.get("perPage", limit),
        }
    }
    return _proxy_deep_images(response)

@app.route("/api/schedule", methods=["GET"])
@api_response
def api_schedule():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 50, type=int)
    start = request.args.get("start", type=int)
    end = request.args.get("end", type=int)
    
    variables = {"page": page, "perPage": limit}
    if start: variables["airingAt_greater"] = start
    if end: variables["airingAt_lesser"] = end
    
    gql = f"""
    query ($page: Int, $perPage: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {{
        Page(page: $page, perPage: $perPage) {{
            pageInfo {{ total currentPage lastPage hasNextPage perPage }}
            airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {{
                episode
                airingAt
                timeUntilAiring
                media {{
                    {MEDIA_LIST_FIELDS}
                }}
            }}
        }}
    }}
    """
    data = _anilist_query(gql, variables)
    page_data = data.get("Page", {})
    page_info = page_data.get("pageInfo", {})
    results = []
    for item in page_data.get("airingSchedules", []):
        # Keep original structure for frontend compatibility
        results.append(item)
        
    response = {
        "media": results, # Frontend expects this name for the list
        "pageInfo": {
            "total": page_info.get("total", 0),
            "currentPage": page_info.get("currentPage", page),
            "lastPage": page_info.get("lastPage", 1),
            "hasNextPage": page_info.get("hasNextPage", False),
            "perPage": page_info.get("perPage", limit),
        }
    }
    return _proxy_deep_images(response)

@app.route("/api/suggestions", methods=["GET"])
@api_response
def api_suggestions():
    query = request.args.get("query", "").strip()
    if not query:
        return {"suggestions": []}
        
    gql = """
    query ($search: String) {
        Page(page: 1, perPage: 8) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                id
                title { romaji english }
                coverImage { large }
                format
                status
                startDate { year }
                episodes
            }
        }
    }
    """
    data = _anilist_query(gql, {"search": query})
    results = []
    for item in data.get("Page", {}).get("media", []):
        results.append({
            "id": item["id"],
            "title": item["title"].get("english") or item["title"].get("romaji"),
            "title_romaji": item["title"].get("romaji"),
            "poster": item["coverImage"]["large"],
            "format": item.get("format"),
            "status": item.get("status"),
            "year": (item.get("startDate") or {}).get("year"),
            "episodes": item.get("episodes"),
        })
    return _proxy_deep_images({"suggestions": results})

@app.route("/api/info/<int:anilist_id>", methods=["GET"])
@api_response
def api_info(anilist_id):
    gql = f"""
    query ($id: Int) {{
        Media(id: $id, type: ANIME) {{
            {MEDIA_FULL_FIELDS}
        }}
    }}
    """
    data = _anilist_query(gql, {"id": anilist_id})
    media = data.get("Media")
    if not media:
        return {"error": "Anime not found"}, 404
    return _proxy_deep_images(media)


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Miruro
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/miruro/episodes/<anilist_id>", methods=["GET"])
@api_response
def api_miruro_episodes(anilist_id):
    data = miruro.get_episodes(anilist_id)
    if not data or "providers" not in data:
        return {"error": "Failed to fetch episodes from Miruro"}, 500
        
    # Group episodes by number and collect all providers for each
    episodes_map = {}
    
    for prov_name, prov_data in data["providers"].items():
        # Handle both SUB and DUB
        for cat in ["sub", "dub"]:
            eps = prov_data.get("episodes", {}).get(cat, [])
            for ep in eps:
                ep_num = str(ep.get("number"))
                if ep_num not in episodes_map:
                    episodes_map[ep_num] = {
                        "number": ep.get("number"),
                        "title": ep.get("title") or f"Episode {ep.get('number')}",
                        "providers": []
                    }
                
                episodes_map[ep_num]["providers"].append({
                    "id": ep.get("id"),
                    "name": prov_name,
                    "category": cat # Track if this provider is for sub or dub
                })
            
    # Convert map to sorted list
    sorted_episodes = sorted(episodes_map.values(), key=lambda x: x["number"])
        
    if not sorted_episodes:
        return {"error": "No episodes found on Miruro"}, 404
        
    return {
        "success": True,
        "episodes": sorted_episodes,
        "anilist_id": anilist_id,
        "count": len(sorted_episodes)
    }

@app.route("/api/check-dub/<anilist_id>", methods=["GET"])
@api_response
def api_check_dub(anilist_id):
    """Legacy route for frontend to check if dub episodes exist."""
    data = miruro.get_episodes(anilist_id)
    if not data or "providers" not in data:
        return {"hasSub": True, "hasDub": False, "subCount": 0, "dubCount": 0}
        
    sub_count = 0
    dub_count = 0
    
    # Check all providers to see the max episode counts for sub and dub
    for prov_name, prov_data in data.get("providers", {}).items():
        eps = prov_data.get("episodes", {})
        sub_count = max(sub_count, len(eps.get("sub", [])))
        dub_count = max(dub_count, len(eps.get("dub", [])))
            
    return {
        "hasSub": sub_count > 0,
        "hasDub": dub_count > 0,
        "subCount": sub_count,
        "dubCount": dub_count
    }

@app.route("/api/miruro/stream", methods=["GET"])
@api_response
def api_miruro_stream():
    ep_id = request.args.get("id")
    provider = request.args.get("provider")
    anilist_id = request.args.get("anilist_id")
    category = request.args.get("category", "sub")
    
    log.info(f"Stream Request: ID={ep_id}, Provider={provider}, AniListID={anilist_id}, Category={category}")
    
    if not all([ep_id, provider, anilist_id]):
        log.warning(f"Missing parameters: id={ep_id}, provider={provider}, anilist_id={anilist_id}")
        return {"error": "Missing parameters (id, provider, anilist_id required)"}, 400
        
    try:
        data = miruro.get_sources(ep_id, provider, int(anilist_id), category)
    except ValueError:
        return {"error": "Invalid AniList ID (must be an integer)"}, 400

    if not data or "streams" not in data:
        log.error(f"Miruro extractor failed for {ep_id}")
        return {"error": "Failed to extract stream from Miruro"}, 500
        
    # Format for frontend
    sources = []
    for stream in data.get("streams", []):
        if stream.get("type") == "hls":
            # Add proxy URL to help with CORS if needed
            original_url = stream["url"]
            # Encode URL to pass safely
            encoded_url = base64.urlsafe_b64encode(original_url.encode()).decode()
            sources.append({
                "url": original_url,
                "proxy_url": f"{request.host_url.rstrip('/')}/api/proxy?url={encoded_url}",
                "quality": stream.get("quality", "auto"),
                "isM3U8": True,
                "type": "hls"
            })
            
    # Include subtitles if any
    subtitles = []
    for sub in data.get("subtitles", []):
        subtitles.append({
            "url": sub["file"],
            "lang": sub.get("label", "Unknown")
        })
            
    # Priority: If Miruro provides an embed, it usually works better for CORS
    iframe_url = ""
    if "embed" in data and data["embed"].get("url"):
        iframe_url = data["embed"]["url"]
    elif "embeds" in data and len(data["embeds"]) > 0:
        iframe_url = data["embeds"][0].get("url", "")

    return {
        "success": True,
        "sources": sources,
        "subtitles": subtitles,
        "iframe_url": iframe_url
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  HLS PROXY — REWRITING ENGINE (Production Ready)
# ═══════════════════════════════════════════════════════════════════════════════

def _encode_url(url):
    return base64.urlsafe_b64encode(url.encode()).decode()

def _decode_url(encoded):
    try:
        return base64.urlsafe_b64decode(encoded).decode()
    except:
        return encoded

from urllib.parse import urljoin

def _rewrite_m3u8(content, base_url, proxy_base_url):
    """Rewrites a .m3u8 manifest to route all links through the proxy."""
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        line = line.strip()
        if not line: 
            new_lines.append("")
            continue
        
        if line.startswith('#'):
            # Handle attributes that contain URLs (e.g. URI="...")
            if 'URI="' in line:
                def replace_uri(match):
                    uri = match.group(1)
                    full_uri = urljoin(base_url, uri)
                    return f'URI="{proxy_base_url}?url={_encode_url(full_uri)}"'
                
                new_line = re.sub(r'URI="([^"]+)"', replace_uri, line)
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        else:
            # It's a direct URL or path (segment or variant)
            full_url = urljoin(base_url, line)
            new_lines.append(f"{proxy_base_url}?url={_encode_url(full_url)}")
            
    return '\n'.join(new_lines)

@app.route("/api/proxy", methods=["GET"])
def proxy():
    """Robust HLS Proxy with Manifest Rewriting."""
    encoded_url = request.args.get("url")
    if not encoded_url:
        return "Missing url", 400

    url = _decode_url(encoded_url)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.miruro.to/",
        "Origin": "https://www.miruro.to"
    }

    try:
        # We use stream=True for large segments
        resp = requests.get(url, headers=headers, stream=True, timeout=15, verify=False)
        
        # Read a small chunk to sniff the content if MIME type is generic
        chunk = resp.raw.read(1024)
        is_m3u8 = b"#EXTM3U" in chunk or url.endswith(".m3u8")
        
        from flask import Response
        
        if is_m3u8:
            # It's an HLS manifest, we MUST rewrite it
            # Combine the sniffed chunk with the rest of the stream
            remaining_content = resp.raw.read()
            full_content = (chunk + remaining_content).decode('utf-8', errors='ignore')
            
            proxy_base = f"{request.host_url.rstrip('/')}/api/proxy"
            rewritten = _rewrite_m3u8(full_content, url, proxy_base)
            
            proxy_resp = Response(rewritten, status=resp.status_code, mimetype="application/vnd.apple.mpegurl")
            proxy_resp.headers["Access-Control-Allow-Origin"] = "*"
            proxy_resp.headers["Cache-Control"] = "no-cache"
            return proxy_resp
        
        # For segments (.ts, .m4s, etc), pipe the remaining stream
        from flask import stream_with_context
        
        def generate():
            yield chunk # Yield the sniffed chunk first
            while True:
                data = resp.raw.read(1024 * 16)
                if not data: break
                yield data
                
        proxy_resp = Response(stream_with_context(generate()), status=resp.status_code)
        
        # Copy essential headers
        for h in ["Content-Type", "Content-Length", "Cache-Control"]:
            if h in resp.headers: proxy_resp.headers[h] = resp.headers[h]
            
        proxy_resp.headers["Access-Control-Allow-Origin"] = "*"
        return proxy_resp

    except Exception as e:
        log.error(f"Proxy Error: {str(e)} for URL: {url[:100]}")
        return str(e), 500

    except Exception as e:
        log.error(f"Proxy Error: {str(e)} for URL: {url[:100]}")
        return str(e), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — MALSync
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/malsync/<mal_id>", methods=["GET"])
@api_response
def api_malsync(mal_id):
    data = http.get_json(f"https://api.malsync.moe/mal/anime/{mal_id}")
    return data


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — AniList Proxy (Bypass CORS)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/anilist/proxy", methods=["POST"])
@api_response
def api_anilist_proxy():
    payload = request.get_json()
    if not payload or "query" not in payload:
        return {"error": "Invalid payload"}, 400

    # 1. Hashing for Cache Key
    # We stringify the payload (query + variables) to create a unique key
    payload_str = _json.dumps(payload, sort_keys=True)
    payload_hash = hashlib.md5(payload_str.encode()).hexdigest()
    cache_key = f"anilist:proxy:{payload_hash}"

    # 2. Check Cache
    entry = _cache.get(cache_key)
    if entry and (time.time() - entry["ts"]) < 300: # 5 minutes cache
        log.info("AniList Proxy: ⚡ Cache Hit")
        return entry["data"]

    # 3. Basic abuse mitigation: Ensure query contains AniList keywords
    query_str = str(payload.get("query", "")).lower()
    allowed_keywords = ["page", "media", "staff", "character", "studio", "airing", "trend", "search", "genrecollection", "airingschedules"]
    if not any(k in query_str for k in allowed_keywords):
         return {"error": "Forbidden: Non-AniList query pattern detected"}, 403

    log.info("AniList Proxy: 🌐 Fetching from Source...")
    import requests
    resp = requests.post(
        "https://graphql.anilist.co",
        json=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
        timeout=20
    )

    # 4. Handle Rate Limiting
    if resp.status_code == 429:
        retry_after = resp.headers.get("Retry-After", "Unknown")
        log.warning(f"AniList Proxy: ⚠️ Rate Limited (429). Retry-After: {retry_after}")
        return {"error": "AniList rate limit reached. Please try again in a moment.", "retry_after": retry_after}, 429

    # 5. Robust response parsing
    try:
        content_type = resp.headers.get("Content-Type", "")
        if "application/json" in content_type:
            data = resp.json()
            
            # Use status code to determine if we should cache
            # Only cache successful responses (no errors field usually)
            if resp.status_code == 200 and "errors" not in data:
                _cache[cache_key] = {"data": data, "ts": time.time()}
                
            return data, resp.status_code
        else:
            log.error(f"AniList Proxy: Non-JSON response received. Headers: {resp.headers}")
            return {"error": "AniList returned non-JSON response"}, resp.status_code
    except Exception as e:
        log.exception("AniList Proxy: Failed to parse response")
        return {"error": "Proxy internal error", "details": str(e)}, 500


# ═══════════════════════════════════════════════════════════════════════════════
#  COMMENT SYSTEM API
# ═══════════════════════════════════════════════════════════════════════════════

COMMENTS_FILE = os.path.join(os.path.dirname(__file__), "comments.json")

def load_comments():
    if not os.path.exists(COMMENTS_FILE):
        return {}
    try:
        with open(COMMENTS_FILE, "r", encoding="utf-8") as f:
            return _json.load(f)
    except:
        return {}

def save_comments(comments):
    with open(COMMENTS_FILE, "w", encoding="utf-8") as f:
        _json.dump(comments, f, indent=4)

@app.route("/api/comments", methods=["GET"])
def get_comments():
    anime_id = request.args.get("animeId")
    episode = request.args.get("episode")
    
    if not anime_id or not episode:
        return jsonify({"error": "Missing params"}), 400
        
    all_comments = load_comments()
    key = f"{anime_id}-{episode}"
    return jsonify(all_comments.get(key, []))

@app.route("/api/comments", methods=["POST"])
def post_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        user = data.get("user", "Anonymous")
        avatar = data.get("avatar", "/avatar_placeholder.png")
        content = data.get("content")
        
        if not anime_id or not episode or not content:
            return jsonify({"error": "Invalid data"}), 400
            
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key not in all_comments:
            all_comments[key] = []
            
        import datetime
        new_comment = {
            "id": len(all_comments[key]) + 1,
            "user": user,
            "avatar": avatar,
            "content": content,
            "time": datetime.datetime.now().isoformat(),
            "likes": 0,
            "replies": 0
        }
        
        all_comments[key].insert(0, new_comment) # Newest first
        save_comments(all_comments)
        
        return jsonify(new_comment)
    except Exception as e:
        log.error(f"Comment API Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/comments/vote", methods=["POST"])
def vote_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        action = data.get("action") # 'like' or 'dislike'
        username = data.get("username")
        
        if not anime_id or not episode or not comment_id or not username:
            return jsonify({"error": "Missing data"}), 400
            
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key not in all_comments:
            return jsonify({"error": "Comment not found"}), 404
            
        for c in all_comments[key]:
            if c["id"] == comment_id:
                # Initialize lists if they don't exist
                if "likedBy" not in c: c["likedBy"] = []
                if "dislikedBy" not in c: c["dislikedBy"] = []
                
                if action == "like":
                    if username in c["likedBy"]:
                        c["likedBy"].remove(username)
                    else:
                        if username in c["dislikedBy"]: c["dislikedBy"].remove(username)
                        c["likedBy"].append(username)
                elif action == "dislike":
                    if username in c["dislikedBy"]:
                        c["dislikedBy"].remove(username)
                    else:
                        if username in c["likedBy"]: c["likedBy"].remove(username)
                        c["dislikedBy"].append(username)
                
                # Update counts
                c["likes"] = len(c["likedBy"])
                c["dislikes"] = len(c["dislikedBy"])
                save_comments(all_comments)
                return jsonify({"success": True, "likes": c["likes"], "dislikes": c["dislikes"]})
                
        return jsonify({"error": "Comment not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/comments/delete", methods=["POST"])
def delete_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        username = data.get("username")
        
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key in all_comments:
            for c in all_comments[key]:
                if c["id"] == comment_id and c["user"] == username:
                    c["isDeleted"] = True
                    break
            save_comments(all_comments)
            return jsonify({"success": True})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════════════════════
#  PROGRESS SYSTEM API (Unified fallback for port 5001)
# ═══════════════════════════════════════════════════════════════════════════════

PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "progress.json")

def load_progress():
    if not os.path.exists(PROGRESS_FILE): return {}
    try:
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f: return _json.load(f)
    except: return {}

def save_progress(data):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f: _json.dump(data, f, indent=4)

@app.route("/api/progress", methods=["GET"])
def get_progress():
    return jsonify({"success": True, "progress": list(load_progress().values())})

@app.route("/api/progress/save", methods=["POST"])
def post_progress():
    try:
        data = request.get_json()
        anime_id = str(data.get("animeId"))
        if not anime_id: return jsonify({"error": "Missing animeId"}), 400
            
        all_progress = load_progress()
        import datetime
        all_progress[anime_id] = {
            "animeId": anime_id,
            "episode": data.get("episode"),
            "currentTime": data.get("currentTime"),
            "duration": data.get("duration"),
            "title": data.get("title"),
            "coverImage": data.get("coverImage"),
            "updatedAt": datetime.datetime.now().isoformat()
        }
        save_progress(all_progress)
        return jsonify({"success": True, "progress": all_progress[anime_id]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    banner = """
    █████╗ ███╗   ██╗██╗ ██████╗  ██████╗ 
    ██╔══██╗████╗  ██║██║██╔════╝ ██╔═══██╗
    ███████║██╔██╗ ██║██║██║  ███╗██║   ██║
    ██╔══██║██║╚██╗██║██║██║   ██║██║   ██║
    ██║  ██║██║ ╚████║██║╚██████╔╝╚██████╔╝
    ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝  ╚═════╝ 
               [ API v3.0 — UNIFIED CORE ]
    """
    log.info(banner)
    log.info("HttpClient ready — Engines: Gogoanime, Miruro")
    log.info("Server starting on port 5000...")
    app.run(debug=True, host="0.0.0.0", port=5000)
