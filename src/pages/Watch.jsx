import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAnimeDetails, getEpisodeTitles, getAniwatchId, getAniwatchEpisodes, checkDubAvailability, getJikanAnimeDetails, getAnikaiDetails, getAniwatchDetails, getSecondaryEpisodeMeta, getMalSyncMapping } from "../services/api";
import { resolveAnikaiMatch, resolveAniwatchMatch, scoreMetadata } from "../services/anikaiMapping";
import { useLanguage } from "../context/LanguageContext";
import { useUserList } from "../context/UserListContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import NextEpisodeBanner from "../components/common/NextEpisodeBanner";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Image,
  Play,
  SkipForward,
  SkipBack,
  Clock,
  BookmarkPlus,
  Flag,
  MessageSquare,
  Mic,
  Share2,
  Search,
  Maximize2,
  Zap,
  Activity,
  FastForward,
  MoreVertical,
  Plus,
  Moon,
  Sun,
  PlayCircle,
  Scissors,
  Timer,
  Heart,
  Star,
  Calendar,
  Frown,
  Smile,
  Sparkles,
  Meh,
  CheckCircle2,
  X
} from "lucide-react";

export default function Watch() {
  const { id } = useParams();
  const location = useLocation();
  const isMal = new URLSearchParams(location.search).get("mal") === "true";
  const { getTitle } = useLanguage();
  const { list, addToList, removeFromList } = useUserList();

  const [activeEpisode, setActiveEpisode] = useState(1);
  const [addingAction, setAddingAction] = useState(false);
  const [selectStatus, setSelectStatus] = useState("Watching");
  const [episodeLayout, setEpisodeLayout] = useState("list"); // "grid" | "list" | "detailed"
  const [playerLang, setPlayerLang] = useState("sub");
  const [activeServer, setActiveServer] = useState(1);

  // Safe localStorage helper
  const getSafeStorage = (key, defaultVal) => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return defaultVal;
      return JSON.parse(val);
    } catch (err) {
      console.warn(`[Storage] Failed to parse key "${key}". Resetting to default.`, err);
      return defaultVal;
    }
  };

  // Persisted settings
  const [autoNext, setAutoNext] = useState(() => getSafeStorage("autoNext", true));
  const [autoPlay, setAutoPlay] = useState(() => getSafeStorage("autoPlay", true));
  const [autoSkip, setAutoSkip] = useState(() => getSafeStorage("autoSkip", false));

  const [episodePage, setEpisodePage] = useState(0);
  const [hasDub, setHasDub] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [isEpisodeSearchOpen, setIsEpisodeSearchOpen] = useState(false);

  // Modal states
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [userRating, setUserRating] = useState(() => getSafeStorage(`rating_${id}`, null));
  const [skipTimes, setSkipTimes] = useState(() => getSafeStorage(`skipTimes_${id}`, {}));

  // Sync settings to localStorage
  useEffect(() => localStorage.setItem("autoNext", JSON.stringify(autoNext)), [autoNext]);
  useEffect(() => localStorage.setItem("autoPlay", JSON.stringify(autoPlay)), [autoPlay]);
  useEffect(() => localStorage.setItem("autoSkip", JSON.stringify(autoSkip)), [autoSkip]);
  useEffect(() => localStorage.setItem(`skipTimes_${id}`, JSON.stringify(skipTimes)), [skipTimes, id]);
  useEffect(() => {
    if (userRating) {
      localStorage.setItem(`rating_${id}`, JSON.stringify(userRating));
    }
  }, [userRating, id]);

  const EPISODES_PER_PAGE = 50;
  const GOGO_SLUG_OVERRIDES = {};

  // Reset active episode and page when navigating to a different anime/season
  useEffect(() => {
    setActiveEpisode(1);
    setEpisodePage(0);
  }, [id]);

  // Auto-jump to the correct page when active episode changes
  useEffect(() => {
    const targetPage = Math.floor((activeEpisode - 1) / EPISODES_PER_PAGE);
    setEpisodePage(targetPage);
  }, [activeEpisode]);

  // API Endpoints
  const PYTHON_API = import.meta.env.PROD ? "" : "http://localhost:5000";
  const [streamUrl, setStreamUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const [aniwatchEps, setAniwatchEps] = useState([]);
  const [anikaiEpisodes, setAnikaiEpisodes] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // Reset iframe loading state whenever the URL changes, but include a failsafe!
  useEffect(() => {
    if (streamUrl) {
      setIframeLoaded(false);
      const timer = setTimeout(() => {
        setIframeLoaded(true); // Failsafe unlock after 2 seconds
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIframeLoaded(true);
    }
  }, [streamUrl]);

  const { data: anime, isLoading } = useQuery({
    queryKey: ["animeDetails", id, isMal],
    queryFn: () => getAnimeDetails(id, isMal),
    enabled: !!id,
    staleTime: 0,
  });

  const { data: dubInfo } = useQuery({
    queryKey: ["dubAvailability", id],
    queryFn: () => checkDubAvailability(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const RECS_PER_PAGE = 12;
  const [recPageIndex, setRecPageIndex] = useState(0);
  const [isRecAnimating, setIsRecAnimating] = useState(false);

  // 1. Compute Merged "You May Also Like" (Relations + Recommendations)
  const allRelated = useMemo(() => {
    if (!anime) return [];
    
    // Get Relations (direct sequels/prequels)
    const relations = (anime.relations?.edges || [])
      .filter(edge => edge.node?.type === 'ANIME')
      .map(edge => edge.node);
      
    // Get Recommendations (general suggestions)
    const recommendations = (anime.recommendations?.nodes || [])
      .map(node => node.mediaRecommendation)
      .filter(Boolean);
      
    const merged = [...relations, ...recommendations];
    const seen = new Set();
    
    // Filter out current anime and deduplicate
    return merged.filter(item => {
      if (!item || seen.has(item.id) || Number(item.id) === Number(id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 60); // Fetch even more for pagination depth
  }, [anime, id]);

  // 2. Memoize Paginated Data (Chunks)
  const paginatedRecs = useMemo(() => {
    const pages = [];
    for (let i = 0; i < allRelated.length; i += RECS_PER_PAGE) {
      pages.push(allRelated.slice(i, i + RECS_PER_PAGE));
    }
    return pages;
  }, [allRelated]);

  const currentRecPageData = paginatedRecs[recPageIndex] || [];
  const totalRecPages = paginatedRecs.length;

  // Reset pagination on ID change
  useEffect(() => {
    setRecPageIndex(0);
  }, [id]);

  const changeRecPage = (newIndex) => {
    if (isRecAnimating || newIndex < 0 || newIndex >= totalRecPages) return;
    setIsRecAnimating(true);
    setRecPageIndex(newIndex);
    setTimeout(() => setIsRecAnimating(false), 400);
  };

  useEffect(() => {
    if (dubInfo && typeof dubInfo.hasDub === "boolean") {
      setHasDub(dubInfo.hasDub);
    } else {
      setHasDub(false);
    }
  }, [dubInfo]);

  // MAL Episode Titles (lightweight — only for episode names)
  const { data: malEpisodes } = useQuery({
    queryKey: ["malEpisodes", anime?.idMal],
    queryFn: () => getEpisodeTitles(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // MALSync Mapping for precise external IDs (Kitsu, Aniwatch, etc)
  const { data: malsyncMapping } = useQuery({
    queryKey: ["malsyncMapping", anime?.idMal],
    queryFn: () => getMalSyncMapping(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const kitsuIdFromMapping = malsyncMapping?.Sites?.Kitsu ? Object.keys(malsyncMapping.Sites.Kitsu)[0] : null;

  const kitsuTitle = anime?.title?.english;
  const kitsuAltTitle = anime?.title?.romaji;
  const { data: kitsuEpisodes } = useQuery({
    queryKey: ["kitsuEpisodes", kitsuTitle, kitsuAltTitle, kitsuIdFromMapping],
    queryFn: () => getSecondaryEpisodeMeta(kitsuTitle, kitsuAltTitle, kitsuIdFromMapping),
    enabled: !!kitsuTitle || !!kitsuAltTitle || !!kitsuIdFromMapping,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // ── Multi-level detail fetching (Aniwatch → Anikai → Jikan → Anilist) ──
  const searchTitle = anime?.title?.english || anime?.title?.romaji || anime?.title?.native;

  const { data: aniwatchDetails } = useQuery({
    queryKey: ["aniwatchDetails", searchTitle],
    queryFn: () => getAniwatchDetails(searchTitle),
    enabled: !!searchTitle,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: anikaiDetails } = useQuery({
    queryKey: ["anikaiDetails", searchTitle],
    queryFn: () => getAnikaiDetails(searchTitle),
    enabled: !!searchTitle && !aniwatchDetails,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: jikanDetails } = useQuery({
    queryKey: ["jikanDetails", anime?.idMal],
    queryFn: () => getJikanAnimeDetails(anime?.idMal),
    enabled: !!anime?.idMal && !aniwatchDetails && !anikaiDetails,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Unified priority resolver: Aniwatch → Anikai → Jikan → Anilist
  const resolvedInfo = useMemo(() => {
    const get = (field, ...fallbacks) => {
      const sources = [aniwatchDetails, anikaiDetails];
      for (const src of sources) {
        if (src?.[field]) return src[field];
      }
      // Jikan uses different keys, handle mapping
      const jikanMap = {
        description: jikanDetails?.synopsis,
        country: jikanDetails?.demographics?.[0]?.name ? 'Japan' : null,
        premiered: jikanDetails?.season && jikanDetails?.year ? `${jikanDetails.season} ${jikanDetails.year}` : null,
        aired: jikanDetails?.aired?.string,
        broadcast: jikanDetails?.broadcast?.string,
        episodes: jikanDetails?.episodes?.toString(),
        duration: jikanDetails?.duration,
        status: jikanDetails?.status,
        mal_score: jikanDetails?.score?.toString(),
        studios: jikanDetails?.studios?.map(s => s.name).join(", "),
        producers: jikanDetails?.producers?.map(p => p.name).join(", "),
        genres: jikanDetails?.genres?.map(g => g.name),
        rating: jikanDetails?.rating?.split(" - ")[0],
      };
      if (jikanMap[field]) return jikanMap[field];
      // Final fallback values
      for (const fb of fallbacks) {
        if (fb) return fb;
      }
      return null;
    };
    if (!anime) return {};
    return {
      description: get("description", anime.description),
      country: get("country", anime.countryOfOrigin === 'JP' ? 'Japan' : anime.countryOfOrigin),
      premiered: get("premiered", anime.seasonYear ? `${anime.season?.toLowerCase() || ''} ${anime.seasonYear}` : null),
      aired: get("aired", anime.startDate ? `${anime.startDate.month ? new Date(anime.startDate.year, anime.startDate.month - 1).toLocaleString('default', { month: 'short' }) : '?'} ${anime.startDate.day || '?'}, ${anime.startDate.year}` : null),
      broadcast: get("broadcast"),
      episodes: get("episodes", anime.episodes?.toString()),
      duration: get("duration", anime.duration ? `${anime.duration} min` : null),
      status: get("status", anime.status?.replace(/_/g, ' ')?.toLowerCase()),
      mal_score: get("mal_score", anime.averageScore ? `${(anime.averageScore / 10).toFixed(2)}` : null),
      studios: get("studios", anime.studios?.nodes?.filter(s => s.isAnimationStudio)[0]?.name),
      producers: get("producers", anime.studios?.nodes?.filter(s => !s.isAnimationStudio).map(s => s.name).join(", ")),
      genres: get("genres", anime.genres),
      rating: get("rating"),
    };
  }, [anime, aniwatchDetails, anikaiDetails, jikanDetails]);

  // Resolve current episode image for player background/loading placeholder
  const currentEpisodeImage = useMemo(() => {
    if (!anime) return null;
    const epData = malEpisodes?.find(e => e.mal_id === activeEpisode);
    const aniListEp = anime?.streamingEpisodes?.find(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === activeEpisode
    ) || anime?.streamingEpisodes?.[activeEpisode - 1];

    // Priority:
    // 1. Kitsu (Best for unique screenshots)
    // 2. AniList Thumbnail (If not placeholder)
    // 3. Jikan / MAL
    // 4. Fallback to Anime Banner
    return (kitsuEpisodes?.[activeEpisode]?.image || kitsuEpisodes?.[String(activeEpisode)]?.image) ||
      aniListEp?.thumbnail ||
      epData?.images?.jpg?.image_url ||
      anime?.bannerImage ||
      anime?.coverImage?.extraLarge ||
      anime?.coverImage?.large;
  }, [anime, malEpisodes, activeEpisode, kitsuEpisodes]);

  useEffect(() => {
    const searchTitle = anime?.title?.english || anime?.title?.romaji || anime?.title?.native;
    if (!searchTitle) { setAniwatchEps([]); return; }
    let cancelled = false;
    (async () => {
      try {
        // Step 1: High purity mapping via MALSync
        let strongCandidates = [];
        if (anime?.idMal) {
          try {
            const { data: malsync } = await axios.get(`${PYTHON_API}/api/malsync/${anime.idMal}`);
            const awData = malsync?.Sites?.Aniwatch;
            if (awData) {
              const firstKey = Object.keys(awData)[0];
              const entry = awData[firstKey];
              if (entry?.id) {
                console.info("[Aniwatch] MALSync match found:", entry.title);
                strongCandidates.push({
                  title: entry.title,
                  data_id: entry.id,
                  score: 999, // Super high score
                  source: 'aniwatch'
                });
              }
            }
          } catch {
            console.warn("[Aniwatch] MALSync lookup failed, falling back to search.");
          }
        }

        // Step 2: Dynamic Search
        const searchResults = await getAniwatchId(searchTitle);
        const candidates = resolveAniwatchMatch(strongCandidates.concat(searchResults), anime);

        if (candidates.length === 0) {
          setAniwatchEps([]);
          return;
        }

        // Step 3: Deep Verification (Fetch info for top 3 in parallel)
        console.group(`[Aniwatch] Deep Resolving: ${anime.title?.english || id}`);
        const infoPromises = candidates.map(c =>
          axios.get(`${PYTHON_API}/api/aniwatch/info/${c.data_id}`)
            .then(res => ({ ...c, info: res.data }))
            .catch(() => ({ ...c, info: null }))
        );

        const verificationResults = await Promise.all(infoPromises);
        if (cancelled) {
          console.groupEnd();
          return;
        }

        const finalScored = verificationResults.map(v => {
          const metaScore = (v.info?.success !== false && v.info) ? scoreMetadata(anime, v.info) : 0;
          return { ...v, totalScore: (v.score || 0) + metaScore };
        });

        finalScored.sort((a, b) => b.totalScore - a.totalScore);
        const best = finalScored[0];

        // Detailed logs for browser console transparency
        console.table(finalScored.map(f => ({
          Title: f.title,
          Initial: f.score,
          MetaBonus: f.totalScore - f.score,
          Total: f.totalScore,
          Year: f.info?.premiered || f.info?.aired,
          Eps: f.info?.episodes
        })));
        console.groupEnd();

        const awId = best.data_id;
        const eps = await getAniwatchEpisodes(awId);
        if (!cancelled && eps) {
          setAniwatchEps(eps);
          console.log("[Aniwatch] Final Result: %s (%s) episodes=%d", best.title, awId, eps.length);
        }
      } catch (err) {
        console.error("Aniwatch deep resolve error:", err);
        if (!cancelled) setAniwatchEps([]);
      }
    })();
    return () => { cancelled = true; };
  }, [anime, id, PYTHON_API]);

  useEffect(() => {
    const searchTitle = anime?.title?.english || anime?.title?.romaji || anime?.title?.native;
    if (!searchTitle) { setAnikaiEpisodes([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const searchResp = await axios.get(`${PYTHON_API}/api/anikai/search`, {
          params: { keyword: searchTitle },
        });
        if (cancelled) return;
        const results = searchResp.data?.results || [];
        if (!searchResp.data?.success || results.length === 0) {
          setAnikaiEpisodes([]);
          return;
        }
        const candidates = resolveAnikaiMatch(results, anime, playerLang);
        if (candidates.length === 0) {
          setAnikaiEpisodes([]);
          return;
        }

        // DEEP VERIFICATION: Fetch info for top candidates in parallel
        console.group(`[Mapping] Deep Resolving: ${anime.title?.english || id}`);
        const infoPromises = candidates.map(c =>
          axios.get(`${PYTHON_API}/api/anikai/info/${c.slug}`)
            .then(res => ({ ...c, info: res.data }))
            .catch(() => ({ ...c, info: null }))
        );

        const verificationResults = await Promise.all(infoPromises);
        if (cancelled) {
          console.groupEnd();
          return;
        }

        const finalScored = verificationResults.map(v => {
          const metaScore = v.info?.success ? scoreMetadata(anime, v.info) : 0;
          return { ...v, totalScore: (v.score || 0) + metaScore };
        });

        finalScored.sort((a, b) => b.totalScore - a.totalScore);
        const best = finalScored[0];

        // Log detailed scoring for transparency
        console.table(finalScored.map(f => ({
          Title: f.title,
          Initial: f.score,
          MetaBonus: f.totalScore - f.score,
          Total: f.totalScore,
          Year: f.info?.year,
          Eps: f.info?.episodes?.length
        })));
        console.groupEnd();

        const resolvedSlug = best.slug;
        const aniId = best.info?.ani_id;

        if (!best.info?.success || !aniId) {
          setAnikaiEpisodes([]);
          return;
        }
        const epsResp = await axios.get(`${PYTHON_API}/api/anikai/episodes/${aniId}`);
        if (cancelled) return;
        if (epsResp.data?.success && Array.isArray(epsResp.data.episodes)) {
          setAnikaiEpisodes(epsResp.data.episodes);
          console.log("[Anikai] Final Result: %s (%s) episodes=%d", best.title, resolvedSlug, epsResp.data.episodes.length);
        } else {
          setAnikaiEpisodes([]);
        }
      } catch (err) {
        console.error("Anikai deep resolve error:", err);
        if (!cancelled) setAnikaiEpisodes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [anime, id, PYTHON_API, playerLang]);


  const existingEntry = list.find((i) => i.animeId === Number(id));

  const episodesList = useMemo(() => {
    if (!anime) return [];
    let count = anime.episodes;
    // If the anime is still airing and we have nextAiringEpisode
    if (anime.nextAiringEpisode) {
      count = Math.max(1, anime.nextAiringEpisode.episode - 1);
    }
    // For airing anime: use streamingEpisodes count as fallback
    if (!count && anime.status === 'RELEASING' && anime.streamingEpisodes?.length) {
      count = anime.streamingEpisodes.length;
    }
    if (!count) count = 12; // fallback if entirely unknown
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [anime]);

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery) return episodesList;
    const query = episodeSearchQuery.toLowerCase().trim();
    return episodesList.filter(ep => {
      const epStr = String(ep);
      const kitsuData = kitsuEpisodes?.[ep] || kitsuEpisodes?.[epStr];
      const jikanData = malEpisodes?.find(e => e.mal_id === ep);
      
      const title = (jikanData?.title || kitsuData?.title || "").toLowerCase();
      return epStr.includes(query) || title.includes(query);
    });
  }, [episodesList, episodeSearchQuery, kitsuEpisodes, malEpisodes]);

  // Clamp episodePage when filteredEpisodes changes (e.g. searching)
  useEffect(() => {
    const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
    if (episodePage >= totalPages && totalPages > 0) {
      setEpisodePage(totalPages - 1);
    } else if (filteredEpisodes.length === 0 && episodePage !== 0) {
      setEpisodePage(0);
    }
  }, [filteredEpisodes, EPISODES_PER_PAGE]);

  const [stableSeasons, setStableSeasons] = useState([]);

  useEffect(() => {
    if (!anime) return;

    setStableSeasons(prev => {
      const isAlreadyInList = prev.some(s => s.id === anime.id);

      if (isAlreadyInList) {
        return prev.map(s => ({
          ...s,
          isActive: s.id === anime.id
        }));
      }

      const items = [{
        ...anime,
        isActive: true,
        relationToMain: 'CURRENT'
      }];

      if (anime.relations?.edges) {
        anime.relations.edges.forEach(edge => {
          if (["TV"].includes(edge.node?.format)) {
            items.push({
              ...edge.node,
              isActive: false,
              relationToMain: edge.relationType
            });
          }
        });
      }

      const uniqueMap = new Map();
      items.forEach(item => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        } else {
          if (item.isActive) {
            const existing = uniqueMap.get(item.id);
            existing.isActive = true;
            existing.relationToMain = 'CURRENT';
            uniqueMap.set(item.id, existing);
          }
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());

      uniqueItems.sort((a, b) => {
        const aMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(a.relationToMain) || (!a.relationToMain && ['TV'].includes(a.format)) ? 0 : 1;
        const bMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(b.relationToMain) || (!b.relationToMain && ['TV'].includes(b.format)) ? 0 : 1;

        if (aMain !== bMain) return aMain - bMain;

        const aY = a.startDate?.year || 9999;
        const bY = b.startDate?.year || 9999;
        if (aY !== bY) return aY - bY;
        const aM = a.startDate?.month || 12;
        const bM = b.startDate?.month || 12;
        if (aM !== bM) return aM - bM;
        const aD = a.startDate?.day || 31;
        const bD = b.startDate?.day || 31;
        return aD - bD;
      });

      return uniqueItems;
    });
  }, [anime]);

  const getSeasonLabel = (item) => {
    if (!item) return "Current";

    const title = item.title?.english || item.title?.romaji || "";

    // 1. Explicit indicators in title
    const sMatch = title.match(/(?:Season|S)\s*(\d+)/i) || title.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
    const pMatch = title.match(/(?:Part)\s*(\d+)/i);
    if (sMatch && pMatch) return `S${sMatch[1]} P${pMatch[1]}`;
    if (sMatch) return `Season ${sMatch[1]}`;
    if (pMatch) return `Part ${pMatch[1]}`;

    // 2. Based on Relation Type
    if (item.relationToMain === 'SPIN_OFF') return 'Spin-off';
    if (item.relationToMain === 'SIDE_STORY') return 'Side Story';
    if (item.relationToMain === 'ALTERNATIVE') return 'Alternative';
    if (item.relationToMain === 'SUMMARY') return 'Recap';

    // 3. Based on Format
    if (item.format === 'MOVIE') return 'Movie';
    if (item.format === 'OVA') return 'OVA';
    if (item.format === 'ONA') return 'ONA';
    if (item.format === 'SPECIAL') return 'Special';

    // 4. Extract subtitle if colon exists
    const parts = title.split(":");
    if (parts.length > 1) {
      const subtitle = parts[parts.length - 1].trim();
      if (subtitle.length > 1) return subtitle;
    }

    // 5. Ultimate fallback
    return title;
  };

  const handleAddToList = (status) => {
    const finalStatus = typeof status === "string" ? status : selectStatus;
    addToList({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage?.large,
      totalEpisodes: anime.episodes,
      progress: existingEntry ? existingEntry.progress : 0,
      status: finalStatus,
      score: existingEntry ? existingEntry.score : 0,
    });
    setSelectStatus(finalStatus);
    setAddingAction(false);
  };



  const lastAutoNextTime = useRef(0);
  const autoNextRef = useRef(autoNext);
  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);

  // Go to the next episode
  const goNextEpisode = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoNextTime.current < 3000) return;
    lastAutoNextTime.current = now;

    setActiveEpisode(prev => {
      const next = prev + 1;
      if (next <= episodesList.length) {
        // Clear current stream to show loader immediately for a seamless transition
        setStreamUrl("");
        setIframeLoaded(false);
        return next;
      }
      return prev;
    });
  }, [episodesList.length]);

  const goPrevEpisode = useCallback(() => {
    setActiveEpisode(prev => Math.max(1, prev - 1));
  }, []);

  // ── Megaplay Player Events Listener ──
  useEffect(() => {
    const handleMessage = (event) => {
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {
          // Handle raw string events like "ended" or "complete"
          if (data === "ended" || data === "video_ended" || data === "complete") {
            if (autoNextRef.current) goNextEpisode();
          }
          return;
        }
      }

      if (!data) return;

      // Deep event checking for various player implementations
      const isComplete =
        data.event === "complete" ||
        data.event === "onComplete" ||
        data.event === "ended" ||
        data.event === "finish" ||
        data.type === "complete" ||
        data.type === "ended" ||
        data.status === "completed" ||
        data.status === "finished" ||
        (data.event === "state" && data.data === "completed") ||
        data.message === "ended";

      if (isComplete) {
        if (autoNextRef.current) {
          goNextEpisode();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [goNextEpisode]); // Removed autoNext from deps, using autoNextRef instead for stability

  // ── Stream Logic: Fetch iframe URL for the active episode ──
  useEffect(() => {
    let cancelled = false;

    const fetchStream = async () => {
      if (cancelled) return;

      setStreamLoading(true);
      setFetchError(null);
      setStreamUrl("");
      setIframeLoaded(false);

      try {
        let url = "";
        console.info(`[Player] Fetching stream: Episode ${activeEpisode}, Lang: ${playerLang}, Server: ${activeServer}`);

        // --- SERVER 1: ANIKAI INTEGRATION ---
        if (activeServer === 1) {
          const ep = anikaiEpisodes.find(e => String(e.number) === String(activeEpisode));
          if (!ep) {
            console.error(`[Player] Episode ${activeEpisode} not found in Anikai list. (Length: ${anikaiEpisodes.length})`);
            setFetchError(`Episode ${activeEpisode} not found on Anikai.`);
            setStreamLoading(false);
            return;
          }
          console.log(`[Player] Requesting Stream: Server=${activeServer} Ep=${activeEpisode} Lang=${playerLang}`);
          const token = ep.id;
          console.log(`[Player] Using Anikai Token: ${token} for Lang: ${playerLang}`);
          const resp = await axios.get(`${PYTHON_API}/api/anikai/stream/${token}`, {
            params: { lang: playerLang },
          });
          const data = resp.data;
          if (!data.success) {
            console.warn(`[Player] Anikai backend error: ${data.error}`);
            setFetchError(data.error || "Anikai is currently unreachable.");
            setStreamLoading(false);
            return;
          }
          url = data.iframe_url || (data.sources?.[0]?.url);
          console.info(`[Player] Resolved Anikai URL: ${url}`);
        }

        // --- SERVER 2: MEGAPLAY INTEGRATION (MAL) ---
        else if (activeServer === 2) {
          if (anime?.idMal) {
            url = `https://megaplay.buzz/stream/mal/${anime.idMal}/${activeEpisode}/${playerLang}`;
          } else {
            setFetchError("MAL ID not found for this anime. Try Server 3.");
          }
        }

        // --- SERVER 3: MEGAPLAY INTEGRATION (AniList) ---
        else if (activeServer === 3) {
          url = `https://megaplay.buzz/stream/ani/${id}/${activeEpisode}/${playerLang}`;
        }

        // --- SERVER 4: MEGAPLAY ANIWATCH ---
        else if (activeServer === 4) {
          const awEp = aniwatchEps.find(e => String(e.number) === String(activeEpisode));
          if (awEp) {
            url = `https://megaplay.buzz/stream/s-2/${awEp.id}/${playerLang}`;
          } else {
            setFetchError("Aniwatch episode ID not found. Try Server 2 or 3.");
          }
        }

        if (url) {
          // Inject Autoplay and premium params
          try {
            const urlObj = new URL(url);
            if (autoPlay) {
              urlObj.searchParams.set("autoplay", "1");
              // Browser Policy: Autoplay is only allowed if the video is muted.
              // We mute it so it starts automatically as requested, and user can unmute.
              urlObj.searchParams.set("muted", "1");
            } else {
              urlObj.searchParams.set("muted", "0");
            }

            // FORCE REFRESH: Append a hash to ensure unique URL per language
            // This forces React to destroy the iframe and create a new one.
            const finalUrl = `${urlObj.toString()}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL injected into iframe: ${finalUrl}`);
          } catch {
            // Fallback for non-URL strings
            const finalUrl = `${url}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL (Fallback) injected: ${finalUrl}`);
          }
        } else if (!fetchError) {
          setFetchError("Stream link not found for this server.");
        }
      } catch (err) {
        setFetchError(err.response?.data?.error || "Failed to fetch stream.");
      } finally {
        setStreamLoading(false);
      }
    };

    fetchStream();

    return () => { cancelled = true; };
  }, [id, anime?.id, activeEpisode, playerLang, activeServer, aniwatchEps, anikaiEpisodes, PYTHON_API, autoPlay]);

  const handleReport = () => {
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const saveSkipTime = (e) => {
    e.preventDefault();
    const start = e.target.start.value;
    const end = e.target.end.value;
    setSkipTimes(prev => ({ ...prev, [activeEpisode]: { start, end } }));
    setShowSkipModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Anime Not Found</h1>
        <p className="text-white/40 text-sm max-w-md">
          We couldn't retrieve the details for this anime (ID: {id}).
          This could be a connectivity issue with the AniList API or an invalid ID.
        </p>
        <div className="mt-8 p-4 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-left">
          <p className="text-red-500 mb-1">// Debug Info</p>
          <p>ID: {id}</p>
          <p>API: {PYTHON_API || "Relative (Origin)"}</p>
          <p>Status: Loading Finished (No Data)</p>
        </div>
        <Link to="/home" className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors text-sm font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans pb-20 text-white relative">
      <Navbar />

      {/* Focus Mode Curtain */}
      {isFocusMode && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-30 transition-all duration-700 animate-in fade-in"
          onClick={() => setIsFocusMode(false)}
        />
      )}

      <main className="pt-[60px] max-w-[1400px] mx-auto px-4 lg:px-6">

        {/* 1. Breadcrumbs */}
        <nav className="flex items-center gap-2 py-2 lg:py-4 text-[11px] lg:text-[12px] font-bold text-[#666] overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link to="/home" className="hover:text-white transition-colors">Home</Link>
          <span className="opacity-30">/</span>
          <span className="hover:text-white transition-colors uppercase cursor-pointer">{anime.format || "TV"}</span>
          <span className="opacity-30">/</span>
          <span className="text-white/90 truncate">{getTitle(anime.title)}</span>
        </nav>

        {/* 2. Main Media Grid (Laptop/Desktop) */}
        <div className={`flex flex-col lg:grid lg:gap-6 ${isFocusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-4'}`}>

          {/* LEFT COLUMN: Player + Controls */}
          <div className={`${isFocusMode ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-1`}>

            {/* Video Player */}
            <section className="relative w-full aspect-video bg-[#000] rounded-sm overflow-hidden border border-white/5 shadow-2xl">
              {/* Integrated Loader & Error Overlay with Anime Background */}
              {((streamLoading || (streamUrl && !iframeLoaded)) || (!streamLoading && (!streamUrl || fetchError))) && (
                <div className="absolute inset-0 z-20 group">
                  <img
                    src={currentEpisodeImage}
                    alt="Poster"
                    key={activeEpisode} // Trigger re-animation on episode change
                    className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 animate-in fade-in fill-mode-both ${fetchError || (!streamLoading && !streamUrl) ? 'brightness-[0.7]' : 'brightness-[0.4]'}`}
                  />

                  {/* Content Container */}
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    {/* LOADER STATE */}
                    {(streamLoading || (streamUrl && !iframeLoaded)) ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
                        <div className="space-y-1">
                          <p className="text-white text-[12px] font-black tracking-[0.4em] uppercase">
                            {streamLoading ? "Loading Source" : ""}
                          </p>
                          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest animate-pulse">
                            Please wait a moment...
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ERROR / NO STREAM STATE */
                      <div className="animate-in fade-in zoom-in-95 duration-300">
                        {/* No text badge here, just the background banner is visible */}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Player Iframe */}
              {streamUrl && (
                <iframe
                  key={`${activeServer}-${activeEpisode}-${playerLang}-${streamUrl}`}
                  src={streamUrl}
                  onLoad={() => setIframeLoaded(true)}
                  className={`w-full h-full border-0 transition-opacity duration-500 ${!iframeLoaded ? 'opacity-0' : 'opacity-100'}`}
                  allowFullScreen
                  scrolling="no"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                />
              )}
            </section>

            {/* Premium Action Toolbar (Matches Image) */}
            <section className="flex flex-wrap items-center justify-between py-3 border-b border-white/5 bg-[#0d0d0d] px-4 shadow-lg gap-y-4 lg:gap-y-0">
              <div className="flex items-center gap-5 lg:gap-8">
                {/* Focus */}
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className={`flex items-center gap-2 transition-all ${isFocusMode ? 'text-yellow-500' : 'text-white/40 hover:text-white'}`}
                >
                  {isFocusMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Focus</span>
                </button>

                {/* AutoPlay */}
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`flex items-center gap-2 transition-all ${autoPlay ? 'text-red-600' : 'text-white/40 hover:text-white'}`}
                >
                  <PlayCircle size={16} fill={autoPlay ? "currentColor" : "none"} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">AutoPlay</span>
                </button>

                {/* AutoNext */}
                <button
                  onClick={() => setAutoNext(!autoNext)}
                  className={`flex items-center gap-2 transition-all ${autoNext ? 'text-red-600' : 'text-white/40 hover:text-white'}`}
                >
                  <FastForward size={16} fill={autoNext ? "currentColor" : "none"} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">AutoNext</span>
                </button>

                {/* AutoSkip */}
                <button
                  onClick={() => setAutoSkip(!autoSkip)}
                  className={`flex items-center gap-2 transition-all ${autoSkip ? 'text-red-600' : 'text-white/40 hover:text-white'}`}
                >
                  <Scissors size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">AutoSkip</span>
                </button>

                {/* Add Skiptime */}
                <button
                  onClick={() => setShowSkipModal(true)}
                  className={`flex items-center gap-2 transition-all ${skipTimes[activeEpisode] ? 'text-yellow-500' : 'text-white/40 hover:text-white'}`}
                >
                  <Timer size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Add Skiptime</span>
                </button>
              </div>

              <div className="flex items-center gap-5 lg:gap-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={goPrevEpisode}
                    className={`flex items-center gap-1.5 transition-all ${activeEpisode <= 1 ? 'opacity-20 pointer-events-none' : 'text-white/40 hover:text-white'}`}
                  >
                    <SkipBack size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Prev</span>
                  </button>
                  <button
                    onClick={goNextEpisode}
                    className={`flex items-center gap-1.5 transition-all ${activeEpisode >= episodesList.length ? 'opacity-20 pointer-events-none' : 'text-white/40 hover:text-white'}`}
                  >
                    <SkipForward size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Next</span>
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setAddingAction(!addingAction)}
                    className={`flex items-center gap-2 transition-all ${existingEntry ? 'text-red-600' : 'text-white/40 hover:text-white'}`}
                  >
                    <Heart size={16} fill={existingEntry ? "currentColor" : "none"} />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{existingEntry ? existingEntry.status : 'Add to list'}</span>
                  </button>

                  {addingAction && (
                    <div className="absolute bottom-full right-0 mb-3 w-36 bg-[#161616] border border-white/5 rounded-[2px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 flex flex-col">
                      {['Watching', 'On-Hold', 'Planning', 'Completed', 'Dropped'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleAddToList(status)}
                          className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors ${(existingEntry ? existingEntry.status : selectStatus) === status
                            ? 'text-white border-l-2 border-red-600 bg-white/5'
                            : 'text-white/60 hover:text-white hover:bg-[#222]'
                            }`}
                        >
                          {status}
                        </button>
                      ))}
                      {existingEntry && (
                        <button
                          onClick={() => {
                            removeFromList(anime.id);
                            setAddingAction(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors text-red-500 hover:text-white hover:bg-red-600/20 border-t border-white/5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleReport}
                  className={`flex items-center gap-2 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/40 hover:text-white'}`}
                >
                  <Flag size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{reportSuccess ? 'Reported!' : 'Report'}</span>
                </button>
              </div>
            </section>
            <section className="flex flex-col md:flex-row md:items-center justify-between py-4 lg:py-6 gap-4 lg:gap-6">
              <div className="text-center md:text-left">
                <p className="text-[13px] lg:text-[14px] font-bold text-white/70 tracking-wide">
                  You are watching <span className="text-red-600">Episode {activeEpisode}</span>
                </p>
                <p className="text-[9px] lg:text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1">
                  Switch servers if the current link is unstable.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Language Selector */}
                <div className="flex bg-[#161616] p-1 rounded-sm border border-white/5">
                  <button
                    onClick={() => setPlayerLang("sub")}
                    className={`flex items-center gap-2 px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "sub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                      }`}
                  >
                    <MessageSquare size={12} fill="currentColor" className="opacity-50" />
                    Sub
                  </button>
                  {hasDub && (
                    <button
                      onClick={() => setPlayerLang("dub")}
                      className={`flex items-center gap-2 px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "dub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                        }`}
                    >
                      <Mic size={12} fill="currentColor" className="opacity-50" />
                      Dub
                    </button>
                  )}
                </div>

                {/* Servers List */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[300px]">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setActiveServer(num)}
                      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all shrink-0 ${activeServer === num
                        ? "bg-red-600 text-white border-red-500 shadow-xl shadow-red-900/20"
                        : "bg-[#111] text-white/30 border-white/5 hover:bg-[#161616] hover:text-white/70"
                        }`}
                    >
                      S{num}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Next Episode Banner - Moved here for better visibility */}
            <div className="border-t border-white/5 bg-[#0d0d0d]/50">
              <NextEpisodeBanner anime={anime} />
            </div>
          </div>

          {/* RIGHT COLUMN: Episodes Sidebar */}
          {!isFocusMode && (
            <aside className="lg:col-span-1 space-y-4 pt-4 lg:pt-0 animate-in fade-in slide-in-from-right duration-500">
              <div className="bg-[#0d0d0d] rounded-sm border border-white/5 overflow-hidden flex flex-col h-[500px] lg:h-full lg:max-h-[700px]">

                {/* Sidebar Header */}
                <header className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111] min-h-[60px]">
                  {isEpisodeSearchOpen ? (
                    <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-right-2 duration-300">
                      <Search size={14} className="text-red-500 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search episode or title..."
                        value={episodeSearchQuery}
                        onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-[12px] text-white placeholder:text-white/20 w-full font-medium"
                      />
                      <button 
                        onClick={() => {
                          setIsEpisodeSearchOpen(false);
                          setEpisodeSearchQuery("");
                        }}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">Episodes</h2>
                        <div className="flex gap-2">
                          <MessageSquare size={12} className="text-red-500" fill="currentColor" />
                          <Mic size={12} className="text-white/20" fill="currentColor" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-white/50">
                        <Search 
                          size={17} 
                          className="hover:text-white cursor-pointer transition-colors" 
                          onClick={() => setIsEpisodeSearchOpen(true)}
                        />
                        <button
                          onClick={() => {
                            if (episodeLayout === "grid") setEpisodeLayout("list");
                            else if (episodeLayout === "list") setEpisodeLayout("detailed");
                            else setEpisodeLayout("grid");
                          }}
                          className="hover:text-white transition-colors cursor-pointer flex items-center"
                        >
                          {episodeLayout === "grid" && <LayoutGrid size={17} />}
                          {episodeLayout === "list" && <List size={17} />}
                          {episodeLayout === "detailed" && <Image size={17} />}
                        </button>
                      </div>
                    </>
                  )}
                </header>

                {/* Range Selector */}
                {filteredEpisodes.length > 0 && (
                  <div className="p-4 bg-[#0a0a0a] border-b border-white/5">
                    {(() => {
                      const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
                      const pageStart = episodePage * EPISODES_PER_PAGE + 1;
                      const pageEnd = Math.min((episodePage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
                      return (
                        <div className="flex items-center justify-between bg-[#161616] px-3 py-2 rounded-sm border border-white/5">
                          <button
                            disabled={episodePage === 0}
                            onClick={() => setEpisodePage(p => p - 1)}
                            className={`transition-colors ${episodePage > 0 ? 'text-white hover:text-red-500' : 'text-white/5'}`}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="text-[11px] font-bold tracking-widest text-white/80">
                            {String(pageStart).padStart(3, '0')}-{String(pageEnd).padStart(3, '0')}
                          </span>
                          <button
                            disabled={episodePage >= totalPages - 1}
                            onClick={() => setEpisodePage(p => p + 1)}
                            className={`transition-colors ${episodePage < totalPages - 1 ? 'text-white hover:text-red-500' : 'text-white/5'}`}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar bg-[#0d0d0d]">
                  {filteredEpisodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-white/30 animate-in fade-in duration-300">
                      <Search size={32} className="mb-3 opacity-20" />
                      <span className="text-[13px] font-medium">No episodes found</span>
                      <button 
                        onClick={() => setEpisodeSearchQuery("")}
                        className="mt-4 text-[11px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : episodeLayout === "list" && (
                    <div className="flex flex-col gap-2">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => {
                        const epData = malEpisodes?.find(e => e.mal_id === ep);
                        const title = epData?.title || `Episode ${ep}`;
                        return (
                          <button
                            key={ep}
                            onClick={() => setActiveEpisode(ep)}
                            className={`w-full text-left flex flex-col gap-1 px-4 py-3 text-[12px] font-medium transition-all rounded-[2px] border ${activeEpisode === ep
                              ? "bg-red-600/10 text-red-500 border-red-500 shadow-lg"
                              : "bg-[#161616] text-white/70 border-white/5 hover:bg-[#202020] hover:text-white"
                              }`}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 shrink-0 mt-[2px]">EP {String(ep).padStart(2, '0')}</span>
                              <span className="line-clamp-2 leading-tight flex-1">{title}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {episodeLayout === "detailed" && (
                    <div className="flex flex-col gap-3">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => {
                        const epData = malEpisodes?.find(e => e.mal_id === ep);
                        // Match streamingEpisodes by episode number in title, not by index
                        const aniListEp = anime?.streamingEpisodes?.find(
                          se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
                        ) || anime?.streamingEpisodes?.[ep - 1];
                        const title = epData?.title || aniListEp?.title?.replace(/^Episode \d+\s*-\s*/i, '') || kitsuEpisodes?.[ep]?.title || kitsuEpisodes?.[String(ep)]?.title || `Episode ${ep}`;

                        // FIX: Detect if AniList thumbnail is just a placeholder (same as show banner/cover)
                        const isPlaceholder = (url) => {
                          if (!url) return true;
                          return url === anime?.bannerImage || url === anime?.coverImage?.large;
                        };

                        // 1. Kitsu (Best for unique screenshots / Netflix feel)
                        // 2. Jikan (MAL) Image
                        // 3. AniList (Only if it's NOT a placeholder)
                        // 4. Fallback to anime banner
                        const thumbnail = kitsuEpisodes?.[ep]?.image
                          || kitsuEpisodes?.[String(ep)]?.image
                          || epData?.images?.jpg?.image_url
                          || (!isPlaceholder(aniListEp?.thumbnail) && aniListEp?.thumbnail)
                          || anime?.bannerImage
                          || anime?.coverImage?.large;

                        return (
                          <button
                            key={ep}
                            onClick={() => setActiveEpisode(ep)}
                            className={`group w-full text-left flex items-start gap-3 p-3 transition-all rounded-[4px] border ${activeEpisode === ep
                              ? "bg-[#111] border-red-600 shadow-lg"
                              : "bg-[#161616] border-white/5 hover:bg-[#202020] hover:border-white/20"
                              }`}
                          >
                            <div className="w-24 h-16 shrink-0 bg-[#222] rounded-[2px] overflow-hidden relative">
                              {thumbnail ? (
                                <img src={thumbnail} alt={title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#111]">
                                  <span className="text-[18px] font-black text-white/10">{String(ep).padStart(2, '0')}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlayCircle size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-red-500 mb-1">Episode {ep}</div>
                              <h4 className="text-[13px] font-bold text-white mb-1 line-clamp-1">{title}</h4>
                              <div className="flex items-center flex-wrap gap-3 text-[11px] text-white/40 mt-1">
                                {epData?.score && (
                                  <span className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-500" fill="currentColor" />
                                    <span>{epData.score}</span>
                                  </span>
                                )}
                                {epData?.aired && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} className="opacity-50" />
                                    <span>{new Date(epData.aired).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </span>
                                )}
                                {(epData?.filler || epData?.recap) && (
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {epData.filler && <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-widest rounded-[2px]">Filler</span>}
                                    {epData.recap && <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-widest rounded-[2px]">Recap</span>}
                                  </div>
                                )}
                              </div>
                              {/* Kitsu Episode Synopsis (Mini-Info) */}
                              {(kitsuEpisodes?.[ep]?.description || kitsuEpisodes?.[String(ep)]?.description) && (
                                <p className="text-[11px] text-white/30 line-clamp-2 leading-relaxed mt-2 group-hover:text-white/60 transition-colors">
                                  {kitsuEpisodes?.[ep]?.description || kitsuEpisodes?.[String(ep)]?.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {episodeLayout === "grid" && (
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => (
                        <button
                          key={ep}
                          onClick={() => setActiveEpisode(ep)}
                          className={`h-9 lg:h-10 flex items-center justify-center text-[11px] lg:text-[12px] font-bold transition-all rounded-[2px] border ${activeEpisode === ep
                            ? "bg-red-600 text-white border-red-500 shadow-lg"
                            : "bg-[#161616] text-white/30 border-white/5 hover:bg-[#202020] hover:text-white"
                            }`}
                        >
                          {ep}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>


        {/* NEW SEASONS UI */}
        {stableSeasons.length > 0 && !isFocusMode && (
          <section className="py-10 border-t border-white/5 bg-[#0a0a0a] animate-in fade-in duration-700">
            <header className="mb-6 px-2">
              <h2 className="text-[14px] font-bold tracking-[0.2em] text-white uppercase opacity-80">
                Seasons
              </h2>
            </header>

            <div className="flex gap-1 overflow-x-auto pb-6 scrollbar-hide px-2">
              {stableSeasons.map((item) => (
                <Link
                  key={item.id}
                  to={item.isActive ? "#" : `/watch/${item.id}`}
                  onClick={(e) => item.isActive && e.preventDefault()}
                  className={`flex-shrink-0 relative group rounded-[2px] overflow-hidden transition-all duration-300 border border-white/5 ${item.isActive ? 'ring-1 ring-white/10' : 'hover:border-white/20'}`}
                  style={{ width: '220px', height: '110px' }}
                >
                  {/* Background Image with Blur/Darken */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={item.coverImage?.large}
                      alt=""
                      className={`w-full h-full object-cover transition-all duration-700 ${item.isActive ? 'scale-110 blur-[1px] opacity-40' : 'opacity-20 blur-[2px] group-hover:opacity-30'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
                    {/* Episodes Badge */}
                    <div className={`px-2 py-0.5 rounded-[1px] font-bold text-[10px] uppercase tracking-[0.1em] mb-2 shadow-sm transition-colors ${item.isActive
                      ? 'bg-red-600 text-white'
                      : 'bg-[#b0b0b0] text-[#111]'
                      }`}>
                      {item.episodes || '?'} Eps
                    </div>

                    {/* Season Label */}
                    <h3 className={`text-[13px] font-bold uppercase tracking-[0.1em] text-center line-clamp-1 transition-all ${item.isActive
                      ? 'text-white'
                      : 'text-[#666] group-hover:text-[#999]'
                      }`}>
                      {getSeasonLabel(item)}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. Anime Details Section */}
        {!isFocusMode && (
          <section className="py-8 lg:py-12 border-t border-white/5 mt-6 lg:mt-10 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
              {/* Poster Column */}
              <div className="w-[180px] sm:w-[220px] shrink-0 mx-auto md:mx-0">
                <div className="relative group overflow-hidden rounded-[4px] border border-white/10 shadow-2xl aspect-[2/3] w-full">
                  {anime.coverImage && (
                    <img
                      src={anime.coverImage.extraLarge || anime.coverImage.large}
                      alt={getTitle(anime.title)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0">
                {/* Title Area */}
                <div className="mb-4">
                  <h1 className="text-2xl sm:text-[32px] font-bold text-white leading-tight mb-1 line-clamp-2">
                    {getTitle(anime.title)}
                  </h1>
                  {anime.synonyms && anime.synonyms.length > 0 && (
                    <p className="text-[13px] text-white/40 italic line-clamp-1 mt-1 mb-4">
                      {anime.synonyms.slice(0, 3).join("; ")}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-6 text-[11px] font-bold">
                    <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                      <span className="px-1.5 h-full bg-[#e3e3e3] text-black flex items-center">CC</span>
                      <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
                    </div>
                    {hasDub && (
                      <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                        <span className="px-1.5 h-full bg-[#f4a1ce] text-black flex items-center justify-center"><Mic size={11} fill="currentColor" /></span>
                        <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
                      </div>
                    )}
                    <span className="bg-[#b0b0b0] text-[#111] h-6 flex items-center px-2 rounded-[2px] font-medium">{resolvedInfo.rating || "?"}</span>
                    {anime.isAdult && <span className="bg-[#e3e3e3] text-black h-6 flex items-center px-2 rounded-[2px] uppercase">R</span>}
                    <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.format || "TV"}</span>
                    <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.duration ? `${anime.duration} min` : "? min"}</span>
                  </div>
                </div>


                {/* Description */}
                <div
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className={`text-[14px] text-white/60 leading-relaxed mb-8 transition-all duration-500 cursor-pointer ${isDescExpanded ? "" : "line-clamp-4"}`}
                  dangerouslySetInnerHTML={{ __html: resolvedInfo.description || "No description available." }}
                />

                {/* Grid Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-[13px] mb-8">
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Country:</span>
                    <span className="text-white/80">{resolvedInfo.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Premiered:</span>
                    <span className="text-white/80 capitalize">{resolvedInfo.premiered || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Date aired:</span>
                    <span className="text-white/80">{resolvedInfo.aired || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Broadcast:</span>
                    <span className="text-white/80">{resolvedInfo.broadcast || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Episodes:</span>
                    <span className="text-white/80">{resolvedInfo.episodes || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Duration:</span>
                    <span className="text-white/80">{resolvedInfo.duration || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Status:</span>
                    <span className="text-white/80 capitalize">{resolvedInfo.status || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">MAL Score:</span>
                    <span className="text-white/80">{resolvedInfo.mal_score || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Links:</span>
                    <div className="flex items-center gap-1">
                      {anime.idMal && <a href={`https://myanimelist.net/anime/${anime.idMal}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors">MAL</a>}
                      {anime.idMal && <span className="text-white/80">,</span>}
                      {anime.id && <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors ml-1">AL</a>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Studios:</span>
                    <span className="text-white/80 truncate">{resolvedInfo.studios || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Producers:</span>
                    <span className="text-white/80 line-clamp-1">{resolvedInfo.producers || "N/A"}</span>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {(resolvedInfo.genres || []).map(g => (
                    <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-4 py-1 bg-white/5 border border-white/5 rounded-[4px] text-[12px] font-medium text-white/50 hover:text-white hover:border-white/20 hover:bg-white/10 transition-colors cursor-pointer">
                      {g}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pixel-Perfect Rating Section (Right Column) */}
              <div className="flex flex-col gap-4 w-full md:w-[280px] lg:w-[320px] shrink-0">
                <div className="bg-[#0d0d0d] border border-white/5 p-7 rounded-sm shadow-xl relative mt-0 md:mt-2 min-h-[160px] flex flex-col items-center justify-center">
                  
                  {userRating ? (
                    <div className="text-center py-4 animate-in zoom-in duration-500">
                      <div className="flex justify-center mb-3">
                        <CheckCircle2 size={28} className="text-white/40" />
                      </div>
                      <p className="text-[14px] font-medium text-white/80 mb-1">Thank you for rating!</p>
                      <p className="text-[12px] text-white/20">Your feedback is appreciated.</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <h3 className="text-[18px] font-medium text-white/80 mb-1">How'd you rate this anime?</h3>
                        <p className="text-[13px] text-white/30 font-medium">
                          {resolvedInfo.mal_score || "8.58"} / {resolvedInfo.scored_by?.toLocaleString() || "1,221"} reviews
                        </p>
                      </div>

                      <div className="flex items-center gap-1 w-full px-2">
                        {[
                          { icon: Frown, val: "boring" },
                          { icon: Smile, val: "decent" },
                          { icon: Smile, val: "masterpiece", isHappy: true }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setUserRating(item.val)}
                            className="flex-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.02] h-20 flex items-center justify-center transition-all duration-300 rounded-[2px] group"
                          >
                            <item.icon 
                              size={28} 
                              strokeWidth={1.5}
                              className={`text-white/30 group-hover:text-white/80 transition-colors ${item.isHappy ? 'scale-110' : ''}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 8. Extra Info: Characters, Trailer, Recs */}
        {!isFocusMode && (
          <section className="py-16 border-t border-white/5 space-y-20 animate-in fade-in duration-1000">
            {/* Characters Section */}
            {anime.characters?.edges?.length > 0 && (
              <div className="space-y-10">
                <header className="flex items-center gap-4">
                  <div className="h-6 w-1 bg-red-600 rounded-full" />
                  <h2 className="text-[14px] font-bold tracking-[0.3em] text-white uppercase">Character Cast</h2>
                </header>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                  {anime.characters.edges.slice(0, 8).map(edge => (
                    <Link 
                      key={edge.node.id} 
                      to={`/character/${edge.node.id}`}
                      className="group flex bg-[#0d0d0d] rounded-sm overflow-hidden border border-white/5 h-20 transition-all hover:bg-[#111] hover:border-red-600/30"
                    >
                      <div className="relative w-12 sm:w-16 h-full overflow-hidden shrink-0">
                        <img src={edge.node.image?.large} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-col justify-center px-3 sm:px-5 flex-1 space-y-0.5 min-w-0">
                        <span className="text-[11px] sm:text-[13px] font-bold text-white transition-colors group-hover:text-red-500 truncate">{edge.node.name?.userPreferred}</span>
                        <span className="text-[8px] sm:text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] truncate">{edge.role}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            {allRelated.length > 0 && (
              <div className="space-y-10">
                <header className="flex items-center gap-4">
                  <div className="h-6 w-1 bg-red-600 rounded-full" />
                  <h2 className="text-[14px] font-bold tracking-[0.3em] text-white uppercase">You May Also Like</h2>
                </header>

                <div 
                  key={recPageIndex} 
                  className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-6 md:gap-8 gap-y-10 animate-slide-fade"
                >
                  {currentRecPageData.map((rec, i) => (
                    <div key={rec.id || i} className="animate-in fade-in duration-500" style={{ animationDelay: `${i * 30}ms` }}>
                      <AnimeCard anime={rec} loading="lazy" />
                    </div>
                  ))}
                </div>

                {totalRecPages > 1 && (
                  <div className="flex justify-center gap-2 pt-8">
                    {paginatedRecs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => changeRecPage(i)}
                        disabled={isRecAnimating}
                        aria-label={`Go to page ${i + 1}`}
                        aria-current={i === recPageIndex}
                        className={`min-w-[40px] h-10 flex items-center justify-center rounded-sm text-[13px] font-bold transition-all duration-300 ${
                          i === recPageIndex 
                            ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]" 
                            : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/5"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 9. Global Footer */}
        {!isFocusMode && <Footer />}
      </main>

      {/* Skip Time Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className="bg-[#111] border border-white/10 p-8 rounded-[4px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSkipModal(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <FastForward size={20} className="rotate-90" />
            </button>
            <h2 className="text-[20px] font-black uppercase tracking-[0.2em] mb-2">Add Skip Time</h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold mb-8">Set intro/outro for Ep {activeEpisode}</p>

            <form onSubmit={saveSkipTime} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Start (sec)</label>
                  <input
                    name="start"
                    type="number"
                    defaultValue={skipTimes[activeEpisode]?.start || ""}
                    placeholder="80"
                    className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">End (sec)</label>
                  <input
                    name="end"
                    type="number"
                    defaultValue={skipTimes[activeEpisode]?.end || ""}
                    placeholder="120"
                    className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-black uppercase tracking-[0.3em] rounded-[2px] transition-all active:scale-95 shadow-lg shadow-red-900/20"
              >
                Save Timeline
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Toast Notification */}
      {reportSuccess && (
        <div className="fixed bottom-10 right-10 z-[100] bg-green-600 text-white px-8 py-4 rounded-[2px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl animate-in slide-in-from-bottom duration-500">
          Issue Reported Successfully
        </div>
      )}
    </div>
  );
}
