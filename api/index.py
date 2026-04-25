

import os
import re
import json as _json
import logging
import difflib
import hashlib
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

class HttpClient:
    """
    Centralized HTTP client with auto-retry, timeout, and consistent headers.
    Replaces all scattered requests.get/post + AJAX header logic.
    """

    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    }

    def __init__(self, retries=5, backoff=2, timeout=15):
        self.timeout = timeout
        self.session = cloudscraper.create_scraper(
            delay=10,
            browser={
                'custom': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        )
        self.session.headers.update(self.DEFAULT_HEADERS)
        log.info("HttpClient initialized with Stealth Mode headers")

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

    @cached("anikai:genres", ttl=86400) # Cache for 24 hours
    def get_genres(self):
        try:
            log.info("Anikai: Fetching genres list...")
            resp = http.get(self.BASE, timeout=self.TIMEOUT_EXTERNAL)
            soup = BeautifulSoup(resp.text, "html.parser")
            genres = set()
            for a in soup.find_all("a", href=True):
                if "/genres/" in a["href"]:
                    genres.add(a.get_text(strip=True))
            return sorted(list(genres))
        except Exception as e:
            log.error("Anikai: Failed to fetch genres: %s", e)
            return []

    def resolve_to_anilist(self, slug):
        """Resolve an Anikai slug to an AniList ID."""
        info = self.get_info(slug)
        title = info.get("title") if info else None
        
        # If get_info failed (e.g. Anikai redirected to browser page) or returned raw slug
        if not title or title == slug:
            parts = slug.split('-')
            # Anikai slugs end with a short alphanumeric hash like "-6e9kv"
            if len(parts) > 1 and len(parts[-1]) <= 6 and parts[-1].isalnum():
                title = ' '.join(parts[:-1])
            else:
                title = ' '.join(parts)
            
        log.info(f"Resolving Anikai slug '{slug}' (Derived Title: {title}) to AniList...")
        
        # Clean title (remove (Dub), (2025), etc.)
        clean_title = re.sub(r'\(Dub\)|\(\d{4}\)', '', title).strip()
        
        # Search AniList
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
                json={"query": search_query, "variables": {"search": clean_title}},
                headers={"Content-Type": "application/json"}
            )
            data = resp.json()
            results = data.get("data", {}).get("Page", {}).get("media", [])
            
            if not results:
                return None
                
            # Best match logic
            best_match = results[0] # Default to first result
            
            titles = []
            for r in results:
                titles.extend([
                    r["title"].get("romaji", ""),
                    r["title"].get("english", ""),
                    r["title"].get("native", "")
                ])
            titles = [t for t in titles if t]
            
            matches = difflib.get_close_matches(clean_title, titles, n=1, cutoff=0.6)
            if matches:
                matched_title = matches[0]
                for r in results:
                    if matched_title in [r["title"].get("romaji"), r["title"].get("english"), r["title"].get("native")]:
                        best_match = r
                        break
            
            log.info(f"Resolved Anikai '{slug}' -> AniList ID: {best_match['id']}")
            return {"anilist_id": best_match["id"], "title": best_match["title"]}
            
        except Exception as e:
            log.error(f"Anikai resolution failed: {e}")
            return None

    @cached("anikai:browse", ttl=300)
    def browse_genre(self, genre_id, page=1, sort="updated_date", formats=None, status=None, year=None, season=None, country=None, language=None):
        try:
            log.info(f"Anikai: Browsing genre ID {genre_id} (Page {page}, Sort {sort}, Formats {formats}, Status {status}, Year {year}, Season {season}, Country {country}, Language {language})")
            url = f"{self.BASE}/browser"
            params = {"genre[]": genre_id, "page": page, "sort": sort}
            
            # Anikai uses type[] for formats
            if formats:
                # Flask request.args.getlist or comma separated
                if isinstance(formats, str):
                    formats = [f.strip() for f in formats.split(',')]
                # Anikai format types are lowercase: tv, movie, ova, ona, special, music
                params["type[]"] = [f.lower() for f in formats]
                
            if status:
                status_map = {"RELEASING": "releasing", "FINISHED": "completed", "NOT_YET_RELEASED": "info"}
                if status in status_map:
                    params["status[]"] = status_map[status]
                    
            if year:
                params["year[]"] = str(year)
                
            if season:
                params["season[]"] = season.lower()
                
            if country:
                country_map = {"JP": "11", "CN": "2"}
                if country in country_map:
                    params["country[]"] = country_map[country]
                    
            if language:
                if isinstance(language, str):
                    language = [l.strip() for l in language.split(',')]
                params["language[]"] = [l.lower() for l in language]

            resp = http.get(url, params=params, timeout=self.TIMEOUT_EXTERNAL)
            soup = BeautifulSoup(resp.text, "html.parser")
            
            results = []
            for item in soup.select('div.inner'):
                poster_elem = item.select_one('a.poster img')
                title_elem = item.select_one('a.title')
                link_elem = item.select_one('a.poster')
                
                if not title_elem or not link_elem:
                    continue
                    
                title = title_elem.get('title') or title_elem.get_text(strip=True)
                slug_href = link_elem.get('href', '')
                slug = slug_href.replace('/watch/', '').strip() if slug_href else None
                poster = poster_elem.get('data-src') or poster_elem.get('src') if poster_elem else None
                
                if slug and title:
                    # Extract episode count and format type
                    episodes = None
                    fmt = "TV"
                    has_dub = False
                    info_div = item.select_one('div.info')
                    if info_div:
                        sub_span = info_div.select_one('span.sub') or info_div.select_one('span.ep')
                        dub_span = info_div.select_one('span.dub')
                        
                        if dub_span:
                            has_dub = True
                            
                        # Use dub count if available, else sub count
                        target_span = dub_span or sub_span
                        if target_span:
                            ep_txt = target_span.get_text(strip=True)
                            if ep_txt.isdigit():
                                episodes = int(ep_txt)
                        
                        b_tags = info_div.select('b')
                        if b_tags:
                            # The last 'b' tag usually contains the format like 'TV' or 'ONA'
                            # Sometimes an earlier 'b' tag contains the total episodes (e.g., '26')
                            last_b_text = b_tags[-1].get_text(strip=True)
                            if not last_b_text.isdigit():
                                fmt = last_b_text

                    results.append({
                        "id": slug,
                        "title": {"english": title, "romaji": title, "native": title},
                        "coverImage": {"large": poster, "medium": poster},
                        "episodes": episodes,
                        "format": fmt,
                        "dub": has_dub,
                        "isMAL": False,
                        "isAnikai": True
                    })
                    
            has_next = bool(soup.select('.pagination a[title="Next"]'))
            return {"media": results, "pageInfo": {"hasNextPage": has_next, "currentPage": page}}
        except Exception as e:
            log.error(f"Anikai: Browse failed: {e}")
            return {"media": [], "pageInfo": {"hasNextPage": False}}

    @cached("anikai:search", ttl=300)
    def search(self, query):
        try:
            # Using the /browser URL format as suggested by user
            html = http.get_html(f"{self.BASE}/browser", params={"keyword": query})
            soup = BeautifulSoup(html, "html.parser")
            results = []
            
            # Anikai /browser results are inside .aitem or .inner containers
            items = soup.select(".aitem") or soup.select(".inner")
            
            for item in items:
                title_tag = item.select_one(".title") or item.select_one("a.title")
                if not title_tag:
                    continue
                    
                title = title_tag.get_text(strip=True)
                
                # Extract slug from poster link or title link
                link_tag = item.select_one(".poster") or item.select_one("a.title")
                if not link_tag:
                    continue
                    
                href = link_tag.get("href", "")
                slug = href.replace("/watch/", "").strip("/") if "/watch/" in href else href.strip("/")

                # Extract poster
                poster_img = item.select_one(".poster img") or item.select_one("img")
                poster = ""
                if poster_img:
                    poster = poster_img.get("data-src") or poster_img.get("src") or ""

                if title and slug:
                    results.append({
                        "title": title, 
                        "slug": slug, 
                        "poster": poster, 
                        "source": "anikai"
                    })
            return results
        except Exception as e:
            log.error(f"Anikai Search failed: {e}")
            return []

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
            "Genres:": "genres",
            "Rating:": "rating"
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

        # Extract Seasons - More Robust Logic
        seasons = []
        # Find the section that contains "Seasons" text
        seasons_title = soup.find(["h2", "h3", "div"], string=re.compile(r"Seasons", re.I))
        seasons_section = None
        
        if seasons_title:
            # The seasons list is usually the next sibling or a parent's child
            seasons_section = seasons_title.find_next("div", class_=re.compile(r"list|block|items")) or seasons_title.parent
        
        # Fallback to known selectors
        if not seasons_section or not seasons_section.select("a"):
            seasons_section = soup.select_one(".os-list") or soup.select_one(".ss-list") or soup.select_one(".seasons-block") or soup.select_one("#seasons")

        if seasons_section:
            for item in seasons_section.select("a"):
                if "/watch/" not in item.get("href", ""): continue
                
                s_title = item.get_text(strip=True)
                # Clean title if it contains episode count
                s_title = re.sub(r'\d+\s*EPS.*', '', s_title).strip()
                
                s_href = item.get("href", "")
                s_slug = s_href.replace("/watch/", "").strip("/")
                
                # Check for episode count badge
                ep_badge = item.select_one(".ep-status, .tick-item, .tick-eps, .episode-count")
                s_episodes = ep_badge.get_text(strip=True) if ep_badge else ""
                
                # Extract poster
                s_poster_img = item.select_one("img")
                s_poster = ""
                if s_poster_img:
                    s_poster = s_poster_img.get("data-src") or s_poster_img.get("src") or ""
                
                if s_title and s_slug:
                    # Very Strict Filter: Must contain a core part of the main title
                    main_title = info["title"].lower()
                    # Remove "Re:" prefix for better matching if needed, or just use core words
                    core_name = re.sub(r'season.*|part.*|s\d+.*', '', main_title).strip()
                    
                    # Split core name into meaningful words (length > 2)
                    core_keywords = [w for w in re.findall(r'\w+', core_name) if len(w) > 2]
                    
                    is_relevant = any(word in s_title.lower() for word in core_keywords)
                    
                    if is_relevant:
                        seasons.append({
                            "title": s_title,
                            "slug": s_slug,
                            "episodes": s_episodes,
                            "poster": s_poster,
                            "isActive": s_slug == slug or s_slug in slug or slug in s_slug
                        })
        
        info["seasons"] = seasons
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
            "number": int(ep.get("num") or 0) if ep.get("num") is not None else 0,
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

            # Fix: Add Referer header to bypass potential blocks on media endpoint
            headers = {"Referer": embed_url, "User-Agent": HttpClient.DEFAULT_HEADERS["User-Agent"]}
            media_data = http.get_json(f"{embed_base}/media/{video_id}", headers=headers)
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
#  ANIKAI ADDITIONS
# ═══════════════════════════════════════════════════════════════════════════════

    @cached("anikai:recent", ttl=300)
    def get_recent_episodes(self, type="dub", limit=24, page=1):
        """Fetch recently updated episodes from Anikai."""
        results = []
        try:
            # Use /recent for the latest updates
            url = f"{self.BASE}/recent"
            params = {"page": page}
            html = http.get_html(url, params=params)
            soup = BeautifulSoup(html, "html.parser")
            
            # Extract pagination
            last_page = 1
            pagination = soup.select_one(".pagination")
            if pagination:
                pages = pagination.select("li.page-item a.page-link")
                for p in pages:
                    href = p.get("href", "")
                    if "page=" in href:
                        try:
                            p_num = int(href.split("page=")[-1].split("&")[0])
                            if p_num > last_page:
                                last_page = p_num
                        except:
                            continue

            items = soup.select(".aitem")
            for item in items:
                # Check for dub badge
                has_dub = item.select_one(".info .dub")
                if type == "dub" and not has_dub:
                    continue
                
                title_tag = item.select_one(".title")
                poster_img = item.select_one(".poster img")
                href_tag = item.select_one(".poster")
                
                if not title_tag or not href_tag:
                    continue
                
                title = title_tag.get_text(strip=True)
                slug = href_tag.get("href", "").replace("/watch/", "").lstrip("/")
                
                results.append({
                    "id": slug,
                    "title": {
                        "romaji": title,
                        "english": title
                    },
                    "coverImage": {
                        "large": poster_img.get("data-src") or poster_img.get("src") if poster_img else "",
                        "extraLarge": poster_img.get("data-src") or poster_img.get("src") if poster_img else ""
                    },
                    "episodes": has_dub.get_text(strip=True) if has_dub else "?",
                    "dub": True if type == "dub" else bool(has_dub),
                    "format": "TV",
                    "status": "RELEASING"
                })
            
            return {"results": results[:limit], "pageInfo": {"lastPage": last_page, "currentPage": page, "hasNextPage": page < last_page}}
        except Exception as e:
            log.error("Anikai: Recent fetch failed: %s", e)
            return {"results": [], "pageInfo": {"lastPage": 1, "currentPage": page, "hasNextPage": False}}

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
#  INSTANTIATE SCRAPERS
# ═══════════════════════════════════════════════════════════════════════════════

anikai = AnikaiScraper()
gogoanime = GogoanimeScraper()
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
        "engines": ["anikai", "gogoanime"],
        "endpoints": {
            "/api/anikai/search?keyword=": "Search Anikai",
            "/api/anikai/info/<slug>": "Anikai info",
            "/api/anikai/episodes/<ani_id>": "Anikai episodes",
            "/api/anikai/stream/<ep_token>": "Anikai stream",
            "/api/gogoanime/search?keyword=": "Search Gogoanime",
            "/api/gogoanime/info/<slug>": "Gogoanime info",
            "/api/gogoanime/episodes/<gogoanime_id>": "Gogoanime episodes",
            "/api/malsync/<mal_id>": "MALSync lookup",
            "/api/meta/episodes?title=": "Fallback episode metadata (Kitsu)",
            "/api/python/resolve/<slug>": "Resolve string slug to AniList ID",
        },
    })


@app.route("/api/python/resolve/<slug>", methods=["GET"])
@api_response
def api_python_resolve(slug):
    # Try Anikai resolution first
    result = anikai.resolve_to_anilist(slug)
    if result:
        return result
        
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


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES — Anikai
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/anikai/genres", methods=["GET"])
@api_response
def api_anikai_genres():
    return {"genres": anikai.get_genres()}

@app.route('/api/anikai/browse/<genre_id>', methods=['GET'])
@api_response
def api_anikai_browse(genre_id):
    page = request.args.get('page', 1, type=int)
    sort = request.args.get('sort', 'updated_date')
    formats = request.args.getlist('formats[]') or request.args.get('formats')
    status = request.args.get('status')
    year = request.args.get('year')
    season = request.args.get('season')
    country = request.args.get('country')
    language = request.args.getlist('language[]') or request.args.get('language')
    return anikai.browse_genre(genre_id, page, sort, formats, status, year, season, country, language)


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
    # Support strict matching (no fallback to other languages)
    strict = request.args.get("strict", "false").lower() == "true"

    servers = anikai.get_links(ep_token)
    if not servers:
        return {"error": "No servers found for this episode"}, 404

    def is_lang_match(s_lang, target_lang):
        s_lang = (s_lang or "sub").lower()
        target_lang = target_lang.lower()
        if target_lang == "sub":
            return s_lang in ["sub", "softsub", "hardsub", "raw"]
        return s_lang == target_lang

    # Filter by language if strict is requested
    if strict:
        servers = [s for s in servers if is_lang_match(s.get("lang"), lang)]
        if not servers:
            return {"error": f"No {lang} sources found for this episode"}, 404

    def get_score(server):
        name = server.get("name", "").lower()
        server_lang = (server.get("lang") or "sub").lower()
        
        # Priority 1: Language match
        lang_score = 100 if is_lang_match(server_lang, lang) else 0
        # Bonus for exact match
        exact_match = 50 if server_lang == lang else 0
        
        # Priority 2: Quality/Speed preferred servers
        is_mega_like = 10 if ("mega" in name or "server 1" in name or "filemoon" in name) else 0
        
        return (lang_score + exact_match, is_mega_like)

    sorted_servers = sorted(servers, key=get_score, reverse=True)

    last_err = "Failed to resolve any source"
    for server in sorted_servers:
        try:
            server_lang = (server.get("lang") or "sub").lower()
            log.info("Anikai: Resolving %s (%s) for requested lang: %s...", server["name"], server_lang, lang)
            source = anikai.resolve_source(server["link_id"])
            if source and source.get("iframe_url"):
                log.info("Anikai: Successfully selected server: %s", server["name"])
                return {
                    "server_name": server["name"], 
                    "lang": server_lang,
                    **source
                }
        except Exception as e:
            log.warning("Anikai: Server %s failed: %s", server["name"], e)
            last_err = str(e)

    return {"error": last_err}, 500





@app.route("/api/python/resolve/<slug>", methods=["GET"])
@api_response
def api_python_resolve_slug(slug):
    print(f"DEBUG: Resolving slug: {slug}")
    # Try anikai first since we are using it for recent dubs now
    result = anikai.resolve_to_anilist(slug)
    if not result:
        result = gogoanime.resolve_to_anilist(slug)
    
    print(f"DEBUG: Result: {result}")
    if result:
        return result
    return {"error": "Could not resolve slug"}, 404


@app.route("/api/python/recent-dub", methods=["GET"])
@api_response
def api_python_recent_dub():
    limit = request.args.get("limit", 24, type=int)
    page = request.args.get("page", 1, type=int)
    # Use anikai for dubbed episodes
    data = anikai.get_recent_episodes(type="dub", limit=limit, page=page)
    return {
        "media": data["results"],
        "pageInfo": data["pageInfo"]
    }


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
                break
                
        save_comments(all_comments)
        return jsonify({"success": True, "likes": c["likes"], "dislikes": c["dislikes"]})
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

@app.route("/api/comments/edit", methods=["POST"])
def edit_comment():
    try:
        data = request.get_json()
        anime_id = data.get("animeId")
        episode = data.get("episode")
        comment_id = int(data.get("commentId"))
        username = data.get("username")
        new_content = data.get("content")
        
        all_comments = load_comments()
        key = f"{anime_id}-{episode}"
        
        if key in all_comments:
            for c in all_comments[key]:
                if c["id"] == comment_id and c["user"] == username:
                    c["content"] = new_content
                    break
            save_comments(all_comments)
            return jsonify({"success": True})
        return jsonify({"error": "Not found"}), 404
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
    log.info("HttpClient ready — 2 engines loaded")
    log.info("Engines: Anikai · Gogoanime")
    log.info("Server starting on port 5000...")
    app.run(debug=True, host="0.0.0.0", port=5000)
