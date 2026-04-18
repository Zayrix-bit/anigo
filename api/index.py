"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║   ANIGO — Unified Anime Scraper API                                         ║
║   Clean, structured, zero-AJAX architecture using centralized HTTP client   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import re
import json as _json
import logging
import difflib
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


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


log = logging.getLogger("anigo")
log.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(ColoredFormatter("[%(asctime)s] %(levelname)s ⚡ %(message)s", datefmt="%H:%M:%S"))
log.addHandler(_handler)


# ═══════════════════════════════════════════════════════════════════════════════
#  HTTP CLIENT — Centralized, replaces all raw requests / AJAX patterns
# ═══════════════════════════════════════════════════════════════════════════════

class HttpClient:
    """
    Centralized HTTP client with auto-retry, timeout, and consistent headers.
    Replaces all scattered requests.get/post + AJAX header logic.
    """

    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    def __init__(self, retries=5, backoff=1, timeout=15):
        self.timeout = timeout
        self.session = requests.Session()
        retry_strategy = Retry(
            total=retries,
            backoff_factor=backoff,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update(self.DEFAULT_HEADERS)
        log.info("HttpClient initialized — retries=%d, backoff=%ds", retries, backoff)

    def get(self, url, params=None, headers=None, referer=None, timeout=None):
        """GET request with optional overrides."""
        h = {**self.session.headers, **(headers or {})}
        if referer:
            h["Referer"] = referer
        return self.session.get(url, params=params, headers=h, timeout=timeout or self.timeout)

    def post(self, url, data=None, json=None, headers=None, referer=None, timeout=None):
        """POST request with optional overrides."""
        h = {**self.session.headers, **(headers or {})}
        if referer:
            h["Referer"] = referer
        return self.session.post(url, data=data, json=json, headers=h, timeout=timeout or self.timeout)

    def get_json(self, url, params=None, **kwargs):
        """GET and auto-parse JSON response."""
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def get_html(self, url, params=None, **kwargs):
        """GET and return response text (HTML)."""
        resp = self.get(url, params=params, **kwargs)
        resp.raise_for_status()
        return resp.text

    def get_soup(self, url, params=None, **kwargs):
        """GET and return parsed BeautifulSoup."""
        html = self.get_html(url, params=params, **kwargs)
        return BeautifulSoup(html, "html.parser")


# Global client instance
http = HttpClient()

ANIKAI_BASE = "https://anikai.to"
ANIKAI_AJAX = f"{ANIKAI_BASE}/ajax"
ANIKAI_HEADERS = {**HttpClient.DEFAULT_HEADERS, "Referer": ANIKAI_BASE + "/"}
ANIKAI_AJAX_HEADERS = {**ANIKAI_HEADERS, "X-Requested-With": "XMLHttpRequest"}

app = Flask(__name__)
CORS(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER: In-memory TTL cache (replaces lru_cache on mutable dicts)
# ═══════════════════════════════════════════════════════════════════════════════

import time

_cache = {}
CACHE_TTL = 3600  # 1 hour


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
    """Decorator that wraps route handlers with consistent error handling."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            if isinstance(result, tuple):
                return jsonify(result[0]), result[1]
            return jsonify({"success": True, **result})
        except requests.exceptions.RequestException as e:
            log.error("Network error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": f"Network error: {e}"}), 502
        except Exception as e:
            log.error("Error in %s: %s", fn.__name__, e)
            return jsonify({"success": False, "error": str(e)}), 500
    wrapper.__name__ = fn.__name__
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
#  ANIKAI SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class AnikaiScraper:
    """Anikai scraper with encryption/decryption pipeline."""

    BASE = ANIKAI_BASE
    AJAX = ANIKAI_AJAX
    ENC_DEC = "https://enc-dec.app/api"
    TIMEOUT_EXTERNAL = 8  # Reduced timeout for external decryption bridge

    def _encrypt(self, text):
        try:
            url = f"{self.ENC_DEC}/enc-kai"
            log.info("Anikai: Encrypting via %s...", url)
            data = http.get_json(url, params={"text": text}, timeout=self.TIMEOUT_EXTERNAL)
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Encryption failed (check network/ISP): %s", e)
            return None

    def _decrypt_kai(self, text):
        try:
            url = f"{self.ENC_DEC}/dec-kai"
            log.info("Anikai: Decrypting-K via %s...", url)
            resp = http.post(url, json={"text": text}, timeout=self.TIMEOUT_EXTERNAL)
            data = resp.json()
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Decryption-K failed: %s", e)
            return None

    def _decrypt_mega(self, text):
        try:
            url = f"{self.ENC_DEC}/dec-mega"
            log.info("Anikai: Decrypting-M via %s...", url)
            resp = http.post(url, json={
                "text": text,
                "agent": HttpClient.DEFAULT_HEADERS["User-Agent"],
            }, timeout=self.TIMEOUT_EXTERNAL)
            data = resp.json()
            return data.get("result") if data and data.get("status") == 200 else None
        except Exception as e:
            log.warning("Anikai: Decryption-M failed: %s", e)
            return None

    @cached("anikai:search", ttl=300)
    def search(self, query):
        try:
            data = http.get_json(
                f"{self.AJAX}/anime/search",
                params={"keyword": query},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return []

        html = data.get("result", {}).get("html", "") if data else ""
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []
        for item in soup.find_all("a", class_="aitem"):
            title_tag = item.find("h6", class_="title")
            title = title_tag.get_text(strip=True) if title_tag else ""
            href = item.get("href", "")
            slug = str(href).replace("/watch/", "") if str(href).startswith("/watch/") else str(href)

            poster_img = item.select_one(".poster img")
            poster = poster_img.get("src", "") if poster_img else ""

            if title and slug:
                results.append({"title": title, "slug": slug, "poster": poster, "source": "anikai"})
        return results

    def get_info(self, slug):
        try:
            html = http.get_html(f"{self.BASE}/watch/{slug}")
        except Exception:
            return None

        soup = BeautifulSoup(html, "html.parser")
        ani_id = ""

        sync = soup.select_one("script#syncData")
        if sync:
            try:
                data = _json.loads(sync.string) if sync.string else {}
                ani_id = data.get("anime_id", "")
            except Exception:
                pass

        if not ani_id:
            match = re.search(r'"anime_id"\s*:\s*"([^"]+)"', html)
            if match:
                ani_id = match.group(1)

        title = soup.select_one("h1.title")
        
        desc_div = soup.select_one(".film-description .text") or soup.select_one(".description")
        description = desc_div.get_text(separator='<br/>').strip() if desc_div else ""

        info = {
            "ani_id": ani_id,
            "title": title.get_text(strip=True) if title else slug,
            "slug": slug,
            "description": description,
        }

        # Grid detail scraping (same labels as Aniwatch)
        label_map = {
            "Country:": "country",
            "Premiered:": "premiered",
            "Date aired:": "aired",
            "Broadcast:": "broadcast",
            "Episodes:": "episodes",
            "Duration:": "duration",
            "Status:": "status",
            "MAL Score:": "mal_score",
            "Studios:": "studios",
            "Producers:": "producers",
            "Genres:": "genres"
        }

        items = soup.select(".anisc-info .item")
        for item in items:
            head = item.select_one(".item-head")
            if not head:
                continue
            label = head.get_text(strip=True)
            name_tag = item.select_one(".name")
            if name_tag:
                names = [a.get_text(strip=True) for a in item.select("a.name")]
                if not names:
                    names = [name_tag.get_text(strip=True)]
                if label == "Genres:":
                    info["genres"] = names
                else:
                    value = ", ".join(names)
                    if label in label_map:
                        info[label_map[label]] = value
            else:
                value = item.get_text(strip=True).replace(label, "").strip()
                if label in label_map:
                    info[label_map[label]] = value

        return info

    def get_episodes(self, ani_id):
        token = self._encrypt(ani_id)
        if not token:
            return []

        try:
            data = http.get_json(
                f"{self.AJAX}/episodes/list",
                params={"ani_id": ani_id, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return []

        html = data.get("result", "") if data else ""
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        return [{
            "number": int(ep.get("num") or 0),
            "id": ep.get("token", ""),
            "title": ep.select_one("span").get_text(strip=True) if ep.select_one("span") is not None else f"Episode {ep.get('num', 0)}",
        } for ep in soup.select(".eplist a")]

    def get_links(self, ep_token):
        token = self._encrypt(ep_token)
        if not token:
            return []

        try:
            data = http.get_json(
                f"{self.AJAX}/links/list",
                params={"token": ep_token, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return []

        html = data.get("result", "") if data else ""
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        servers = []
        groups = soup.select(".server-items")
        
        if groups:
            for group in groups:
                # Extract lang from data-id (e.g. "sub", "dub", "softsub")
                group_lang = (group.get("data-id") or "sub").lower()
                for item in group.select(".server"):
                    servers.append({
                        "name": item.get_text(strip=True),
                        "link_id": item.get("data-lid", ""),
                        "lang": group_lang
                    })
        else:
            # Fallback for old structure or missing groups
            for item in soup.select(".server"):
                servers.append({
                    "name": item.get_text(strip=True),
                    "link_id": item.get("data-lid", ""),
                    "lang": "sub"
                })
                
        return servers

    def resolve_source(self, link_id):
        token = self._encrypt(link_id)
        if not token:
            return None

        try:
            data = http.get_json(
                f"{self.AJAX}/links/view",
                params={"id": link_id, "_": token},
                headers=ANIKAI_AJAX_HEADERS,
                referer=self.BASE,
            )
        except Exception:
            return None

        encrypted_result = data.get("result", "") if data else ""
        if not encrypted_result:
            return None

        embed_data = self._decrypt_kai(encrypted_result)
        if not embed_data or not embed_data.get("url"):
            return None

        embed_url = embed_data["url"]

        try:
            video_id = embed_url.rstrip("/").split("/")[-1].split("?")[0]
            embed_base = (embed_url.rsplit("/e/", 1)[0] if "/e/" in embed_url
                          else embed_url.replace("/embed-1/", "/").rsplit("/", 1)[0]).rstrip("/")

            media_data = http.get_json(f"{embed_base}/media/{video_id}")
            encrypted_media = media_data.get("result", "")

            final = self._decrypt_mega(encrypted_media)
            if final:
                return {
                    "iframe_url": embed_url,
                    "sources": final.get("sources", []),
                    "subtitles": final.get("tracks", []),
                }
        except Exception as e:
            log.error("Anikai resolution error: %s", e)

        return {"iframe_url": embed_url}


# ═══════════════════════════════════════════════════════════════════════════════
#  ANIWATCH SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

class AniwatchScraper:
    """Aniwatch (aniwatchtv.to) scraper — search and episode IDs."""

    BASE = "https://aniwatchtv.to"

    @cached("aniwatch:search", ttl=300)
    def search(self, keyword):
        """Search and return all potential matches."""
        html = http.get_html(f"{self.BASE}/search", params={"keyword": keyword})
        soup = BeautifulSoup(html, "html.parser")
        
        results = []
        items = soup.select(".flw-item")
        for item in items:
            title_tag = item.select_one(".film-name a")
            poster_tag = item.select_one(".film-poster-ahref")
            
            if not title_tag or not poster_tag:
                continue
                
            results.append({
                "title": title_tag.get_text(strip=True),
                "data_id": poster_tag.get("data-id"),
                "slug": poster_tag.get("href", "").replace("/", ""), # Alternative ID
                "source": "aniwatch"
            })
            
        return results

    @cached("aniwatch:episodes", ttl=1800)
    def get_episodes(self, aniwatch_id):
        """Fetch episode list via the v2 API (no AJAX header needed — uses http client)."""
        data = http.get_json(f"{self.BASE}/ajax/v2/episode/list/{aniwatch_id}")
        html = data.get("html", "")

        episodes = []
        for m in re.finditer(r'data-number="(\d+)"[^>]*data-id="(\d+)"', html):
            episodes.append({"number": int(m.group(1)), "id": m.group(2)})

        if not episodes:
            for m in re.finditer(r'data-id="(\d+)"[^>]*data-number="(\d+)"', html):
                episodes.append({"number": int(m.group(2)), "id": m.group(1)})

        return episodes

    @cached("aniwatch:info", ttl=1800)
    def get_info(self, aniwatch_id):
        try:
            html = http.get_html(f"{self.BASE}/watch/anime-{aniwatch_id}")
            soup = BeautifulSoup(html, "html.parser")
            
            # 1. Description
            desc_div = soup.select_one(".film-description .text")
            description = desc_div.get_text(separator='<br/>').strip() if desc_div else ""

            # 2. Detail Grid Info
            info = {
                "aniwatch_id": aniwatch_id,
                "description": description,
            }

            # Map Aniwatch labels to internal keys
            label_map = {
                "Country:": "country",
                "Premiered:": "premiered",
                "Date aired:": "aired",
                "Broadcast:": "broadcast",
                "Episodes:": "episodes",
                "Duration:": "duration",
                "Status:": "status",
                "MAL Score:": "mal_score",
                "Studios:": "studios",
                "Producers:": "producers",
                "Genres:": "genres"
            }

            # Scrape all detail items
            items = soup.select(".anisc-info .item")
            for item in items:
                head = item.select_one(".item-head")
                if not head:
                    continue
                label = head.get_text(strip=True)
                
                # Extract value (handling cases with multiple links or direct text)
                name_tag = item.select_one(".name")
                if name_tag:
                    # If it's a list (like Studios/Producers/Genres), collect them
                    names = [a.get_text(strip=True) for a in item.select("a.name")]
                    if not names:
                        names = [name_tag.get_text(strip=True)]
                    # For genres, store as list; for others, join as string
                    if label == "Genres:":
                        info["genres"] = names
                    else:
                        value = ", ".join(names)
                        if label in label_map:
                            info[label_map[label]] = value
                else:
                    # Direct text after head
                    value = item.get_text(strip=True).replace(label, "").strip()
                    if label in label_map:
                        info[label_map[label]] = value

            return info
        except Exception as e:
            log.error(f"Aniwatch get_info Error: {e}")
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
            for offset in [0, 100, 200]:
                ep_data = http.get_json(f"{self.API}/episodes", params={
                    "filter[mediaId]": target_id,
                    "page[limit]": 100,
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
                
                if len(ep_data["data"]) < 100:
                    break
                    
            return ep_meta
        except Exception as e:
            log.error(f"Kitsu Metadata Error: {e}")
            return {}

# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANTIATE SCRAPERS
# ═══════════════════════════════════════════════════════════════════════════════

anikai = AnikaiScraper()
aniwatch = AniwatchScraper()
kitsu = KitsuScraper()


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Core
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
@app.route("/api", methods=["GET"])
def index():
    return jsonify({
        "success": True,
        "api": "Anigo Unified Scraper API",
        "status": "online",
        "version": "3.0.1",
        "engines": ["anikai", "aniwatch"],
        "endpoints": {
            "/api/anikai/search?keyword=": "Search Anikai",
            "/api/anikai/info/<slug>": "Anikai info",
            "/api/anikai/episodes/<ani_id>": "Anikai episodes",
            "/api/anikai/stream/<ep_token>": "Anikai stream",
            "/api/aniwatch/search?keyword=": "Search Aniwatch",
            "/api/aniwatch/episodes/<id>": "Aniwatch episodes",
            "/api/malsync/<mal_id>": "MALSync lookup",
            "/api/meta/episodes?title=": "Fallback episode metadata (Kitsu)",
        },
    })


@app.route("/api/meta/episodes", methods=["GET"])
@api_response
def api_meta_episodes():
    title = request.args.get("title", "").strip()
    alt_title = request.args.get("alt_title", "").strip()
    kitsu_id = request.args.get("kitsu_id", "").strip()
    
    if not title and not kitsu_id:
        return {"error": "Title or kitsu_id required"}, 400
        
    return kitsu.get_episode_meta(title=title, alt_title=alt_title, kitsu_id=kitsu_id)


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Anikai
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/anikai/search", methods=["GET"])
@api_response
def api_anikai_search():
    query = request.args.get("keyword", "").strip()
    if not query:
        return {"error": "keyword is required"}, 400
    return {"results": anikai.search(query)}


@app.route("/api/anikai/info/<slug>", methods=["GET"])
@api_response
def api_anikai_info(slug):
    result = anikai.get_info(slug)
    if not result:
        return {"error": "Anime not found"}, 404
    return result


@app.route("/api/anikai/episodes/<ani_id>", methods=["GET"])
@api_response
def api_anikai_episodes(ani_id):
    eps = anikai.get_episodes(ani_id)
    return {"ani_id": ani_id, "count": len(eps), "episodes": eps}


@app.route("/api/anikai/stream/<ep_token>", methods=["GET"])
@api_response
def api_anikai_stream(ep_token):
    lang = request.args.get("lang", "sub").lower()

    servers = anikai.get_links(ep_token)
    if not servers:
        return {"error": "No servers found for this episode"}, 404

    def get_score(server):
        name = server.get("name", "").lower()
        server_lang = (server.get("lang") or "sub").lower()
        
        # Priority 1: Exact language match from the Anikai group data-id
        is_lang_match = 100 if server_lang == lang else 0
        
        # Priority 2: Quality/Speed preferred servers
        is_mega_like = 10 if ("mega" in name or "server 1" in name or "filemoon" in name) else 0
        
        return (is_lang_match, is_mega_like)

    sorted_servers = sorted(servers, key=get_score, reverse=True)

    last_err = "Failed to resolve any source"
    for server in sorted_servers:
        try:
            log.info("Anikai: Resolving %s for requested lang: %s...", server["name"], lang)
            source = anikai.resolve_source(server["link_id"])
            if source and source.get("iframe_url"):
                log.info("Anikai: Successfully selected server: %s", server["name"])
                return {"server_name": server["name"], **source}
        except Exception as e:
            log.warning("Anikai: Server %s failed: %s", server["name"], e)
            last_err = str(e)

    return {"error": last_err}, 500


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Aniwatch
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/aniwatch/search", methods=["GET"])
@api_response
def api_aniwatch_search():
    keyword = request.args.get("keyword", "").strip()
    if not keyword:
        return {"error": "Keyword required"}, 400
    results = aniwatch.search(keyword)
    return {"results": results}


@app.route("/api/aniwatch/episodes/<aniwatch_id>", methods=["GET"])
@api_response
def api_aniwatch_episodes(aniwatch_id):
    eps = aniwatch.get_episodes(aniwatch_id)
    return {"aniwatch_id": aniwatch_id, "count": len(eps), "episodes": eps}


@app.route("/api/aniwatch/info/<aniwatch_id>", methods=["GET"])
@api_response
def api_aniwatch_info(aniwatch_id):
    info = aniwatch.get_info(aniwatch_id)
    if info:
        return info
    return {"error": "Not found"}, 404


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — MALSync
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/malsync/<mal_id>", methods=["GET"])
@api_response
def api_malsync(mal_id):
    data = http.get_json(f"https://api.malsync.moe/mal/anime/{mal_id}")
    return data


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
    log.info("HttpClient ready — 2 engines loaded")
    log.info("Engines: Anikai · Aniwatch")
    log.info("Server starting on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
