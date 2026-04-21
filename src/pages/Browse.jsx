import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBrowseAnime, getBrowseAnimeMAL, checkDubAvailability, getRecentDubs } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Search, ChevronDown, Check, X, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { ALL_GENRES, OFFICIAL_GENRES, GENRE_MAP } from "../constants/genres";
import Pagination from "../components/common/Pagination";

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Filter derivation from URL
  const filters = useMemo(() => {
    const genreStr = searchParams.get("genre") || "";
    const excludeStr = searchParams.get("exclude") || "";
    const formatParams = searchParams.getAll("format");

    const include = genreStr ? genreStr.split(",").filter(Boolean) : [];
    const exclude = excludeStr ? excludeStr.split(",").filter(Boolean) : [];

    return {
      search: searchParams.get("search") || "",
      include,
      exclude,
      genres: include,
      formats: formatParams,
      status: searchParams.get("status") || "",
      sort: searchParams.get("sort") || "TRENDING_DESC",
      year: searchParams.get("year") || "",
      season: searchParams.get("season") || "",
      country: searchParams.getAll("country"),
      rating: searchParams.get("rating") || "",
      language: searchParams.getAll("language"),
      excludeMyList: searchParams.get("onList") === "false",
      page: parseInt(searchParams.get("page") || "1"),
    };
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [prevFiltersSearch, setPrevFiltersSearch] = useState(filters.search);

  // Sync search input if URL changes (e.g. back button), doing it during render to avoid cascading effects
  if (filters.search !== prevFiltersSearch) {
    setPrevFiltersSearch(filters.search);
    setSearchInput(filters.search);
  }
  const consecutiveEmptyPages = useRef(0);
  const isAutoPaging = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (!searchInput) next.delete("search");
        else next.set("search", searchInput);
        next.set("page", "1");
        return next;
      }, { replace: true });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setSearchParams]);

  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("page", newPage.toString());
      return next;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams]);
  const queryData = useMemo(() => {
    const isMAL = filters.include.includes("Avant Garde");
    const vars = {
      page: filters.page,
      perPage: 36,
      sort: [filters.sort],
    };

    if (filters.search) vars.search = filters.search;
    if (filters.formats.length > 0) vars.format_in = filters.formats;

    if (filters.include.length > 0) {
      const gen_in = [];
      const t_in = [];
      filters.include.forEach(g => {
        const mapped = GENRE_MAP[g] || g;
        if (OFFICIAL_GENRES.includes(mapped)) gen_in.push(mapped);
        else t_in.push(mapped);
      });
      if (gen_in.length > 0) vars.genre_in = gen_in;
      if (t_in.length > 0) vars.tag_in = t_in;
    }

    if (filters.status) vars.status = filters.status;
    if (filters.year) vars.seasonYear = parseInt(filters.year);
    if (filters.season) vars.season = filters.season;
    if (filters.country.length > 0) vars.country = filters.country[0];
    if (filters.rating) vars.averageScore_greater = parseInt(filters.rating);

    return { vars, isMAL, lang: filters.language };
  }, [filters]);

  const { data: result = { media: [], pageInfo: { total: 0 } }, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["browse", queryData],
    queryFn: async () => {
      const { vars, isMAL } = queryData;

      // Use the same Dub source as homepage when Dub language is selected.
      if (filters.language.includes("DUB")) {
        const cardsPerPage = 36;
        const startIndex = (filters.page - 1) * cardsPerPage;
        const endIndex = startIndex + cardsPerPage;
        const collected = [];
        const seen = new Set();
        let sourcePage = 1;
        let guard = 0;
        let sourceHasNextPage = false;

        // Build a stable paginated stream so each browse page can still render 36 cards.
        while (collected.length < endIndex && guard < 20) {
          const dubRes = await getRecentDubs(sourcePage, cardsPerPage);
          const media = dubRes.media || [];
          sourceHasNextPage = Boolean(dubRes.pageInfo?.hasNextPage);

          media.forEach((anime) => {
            const key = String(
              anime.id ?? `${anime.title?.romaji || anime.title?.english || "unknown"}-${anime.episodes || ""}`
            );
            if (seen.has(key)) return;
            seen.add(key);
            collected.push({ ...anime, dub: true });
          });

          if (!sourceHasNextPage) break;
          sourcePage += 1;
          guard += 1;
        }

        const pageMedia = collected.slice(startIndex, endIndex);
        const hasNextDubPage = collected.length > endIndex || sourceHasNextPage;
        const dubLastPage = hasNextDubPage ? filters.page + 1 : filters.page;

        return {
          media: pageMedia,
          pageInfo: {
            total: collected.length,
            currentPage: filters.page,
            lastPage: dubLastPage,
            hasNextPage: hasNextDubPage,
            perPage: cardsPerPage,
          },
        };
      }

      let res = await (isMAL ? getBrowseAnimeMAL(vars) : getBrowseAnime(vars));
      
      // SMART-DECORATE WITH DUB INFO
      // 1. Title Heuristic (Instant) + 2. Backend Verification (Accurate)
      const mediaWithDub = await Promise.all(
        (res.media || []).map(async (anime) => {
          try {
            // Heuristic Check (First Pass)
            const searchTitle = (anime.title?.english || "").toLowerCase();
            const synonyms = (anime.synonyms || []).map(s => s.toLowerCase());
            const hasDubKeyword = searchTitle.includes("(dub)") || 
                                 searchTitle.includes("dubbed") || 
                                 synonyms.some(s => s.includes("dub"));
            
            // If heuristic fails, check backend
            if (hasDubKeyword) return { ...anime, dub: true };

            const dubInfo = await checkDubAvailability(anime.id);
            return { ...anime, dub: dubInfo.hasDub };
          } catch {
            return { ...anime, dub: false };
          }
        })
      );

      return { ...res, media: mediaWithDub };
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  const animeList = useMemo(() => {
    const rawList = result.media || [];
    const isDubMode = filters.language.includes("DUB");

    return rawList.filter(anime => {
      const allLabels = [...(anime.genres || []), ...(anime.tags || []).map(t => t.name)];

      // Dub feed data comes from a different source and often lacks AniList metadata
      // like genres/tags/country. Skip those metadata filters in Dub mode.
      if (!isDubMode) {
        if (filters.exclude.some(ex => allLabels.includes(GENRE_MAP[ex] || ex))) return false;
        if (filters.include.length > 0) {
          if (!filters.include.some(inc => allLabels.includes(GENRE_MAP[inc] || inc))) return false;
        }
        if (filters.country.length > 0) {
          const origin = anime.countryOfOrigin || "";
          if (!filters.country.includes(origin)) return false;
        }
      }
      if (filters.language.includes('DUB')) {
        if (!anime.dub) return false;
      }
      return true;
    });
  }, [result.media, filters.include, filters.exclude, filters.country, filters.language]);

  const hasNextPage = result.pageInfo?.hasNextPage || false;

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (animeList.length > 0) {
      consecutiveEmptyPages.current = 0;
      isAutoPaging.current = false;
    } else if (hasNextPage) {
      if (consecutiveEmptyPages.current >= 3) {
        isAutoPaging.current = false;
        return;
      }
      consecutiveEmptyPages.current += 1;
      isAutoPaging.current = true;
      const jumpId = setTimeout(() => handlePageChange(filters.page + 1), 200);
      return () => clearTimeout(jumpId);
    }
  }, [animeList.length, isLoading, isFetching, hasNextPage, filters.page, handlePageChange]);

  const toggleGenre = (genre) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const include = next.get("genre")?.split(",").filter(Boolean) || [];
      const exclude = next.get("exclude")?.split(",").filter(Boolean) || [];
      if (include.includes(genre)) {
        const nextInclude = include.filter(g => g !== genre);
        if (nextInclude.length > 0) next.set("genre", nextInclude.join(",")); else next.delete("genre");
        next.set("exclude", [...exclude, genre].join(","));
      } else if (exclude.includes(genre)) {
        const nextExclude = exclude.filter(g => g !== genre);
        if (nextExclude.length > 0) next.set("exclude", nextExclude.join(",")); else next.delete("exclude");
      } else {
        next.set("genre", [...include, genre].join(","));
      }
      next.set("page", "1");
      return next;
    });
  };

  const toggleFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const urlKey = (key === "formats") ? "format" : key;
      const current = next.getAll(urlKey);
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      next.delete(urlKey);
      updated.forEach(v => next.append(urlKey, v));
      next.set("page", "1");
      return next;
    });
  };

  const setSingleFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key); else next.set(key, value);
      next.set("page", "1");
      return next;
    });
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
    setOpenDropdown(null);
  };

  const handleShuffleSort = () => {
    const sorts = ["TRENDING_DESC", "POPULARITY_DESC", "SCORE_DESC", "START_DATE_DESC"];
    const currentIdx = sorts.indexOf(filters.sort);
    const nextSort = sorts[(currentIdx + 1) % sorts.length];
    setSingleFilter("sort", nextSort);
  };

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-red-500/30 font-sans">
      <Navbar />

      <main className="container max-w-[1720px] mx-auto px-2 md:px-4 pt-16 md:pt-20 pb-20">

        {/* Page Head - Ultra Compact */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-red-600 rounded-full shrink-0" />
            <h2 className="text-2xl font-normal tracking-tighter">Browse</h2>
          </div>
        </div>

        {/* Filters Interface */}
        <div className="mb-6">
          <div className="hidden md:flex flex-col gap-6">
            <div className="flex h-[52px] bg-[#0d0d0d] border border-white/10 rounded-xl overflow-visible shadow-2xl relative">
              <div className="flex-[2.5] relative flex items-center border-r border-white/5">
                <Search className="absolute left-6 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Universal Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-14 pr-12 text-[14px] text-white font-medium placeholder-white/10 outline-none"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput("")} className="absolute right-4 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                    <X size={12} className="text-white/40" />
                  </button>
                )}
              </div>

              {[
                { label: "Types", key: "types", options: [{ label: "TV", value: "TV" }, { label: "Movie", value: "MOVIE" }, { label: "OVA", value: "OVA" }, { label: "ONA", value: "ONA" }, { label: "Special", value: "SPECIAL" }] },
                { label: "Genres", key: "genre", options: ALL_GENRES },
                { label: "Status", key: "status", options: [{ label: "Any", value: "" }, { label: "Releasing", value: "RELEASING" }, { label: "Finished", value: "FINISHED" }, { label: "Upcoming", value: "NOT_YET_RELEASED" }] },
                { label: "Advanced", key: "advanced", active: filters.year || filters.season || filters.rating }
              ].map(dd => (
                <div key={dd.key} className="flex-1 relative flex items-center border-r border-white/5 group">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                    className={`w-full h-full flex items-center justify-between px-6 transition-all hover:bg-white/[0.02] ${openDropdown === dd.key ? 'bg-white/[0.03]' : ''}`}
                  >
                    <span className={`text-[11px] uppercase tracking-[0.2em] font-medium transition-colors ${dd.active ? 'text-red-500' : 'text-white/40'}`}>
                      {dd.label}
                    </span>
                    <ChevronDown size={12} className={`text-white/20 transition-transform duration-300 ${openDropdown === dd.key ? 'rotate-180 text-red-500' : ''}`} />
                  </button>

                  {openDropdown === dd.key && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                      <div className={`absolute top-[calc(100%+8px)] bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-[100] ${
                        dd.key === 'genre' ? 'w-[540px] max-w-[calc(100vw-32px)] left-1/2 -translate-x-1/2' : 
                        dd.key === 'advanced' ? 'right-0' : 'w-40 left-0'
                      }`}>

                        {(dd.key === 'types' || dd.key === 'status') && (
                          <div className="flex flex-col gap-0.5">
                            {dd.options.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  toggleFilter(dd.key === 'types' ? 'format' : 'status', opt.value);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] transition-all flex items-center justify-between group ${(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value)
                                    ? 'bg-red-600/10 text-red-500 font-medium'
                                    : 'text-white/40 hover:bg-white/[0.03] hover:text-white'
                                  }`}
                              >
                                <span>{opt.label}</span>
                                {(dd.key === 'types' ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                              </button>
                            ))}
                          </div>
                        )}

                        {dd.key === 'genre' && (
                          <div className="space-y-3 p-1">
                            <div className="grid grid-cols-5 gap-1">
                              {dd.options.map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => toggleGenre(opt)}
                                  className={`px-2 py-1.5 rounded text-left text-[10px] transition-all flex items-center justify-between group ${filters.include.includes(opt)
                                      ? 'bg-red-600/10 text-red-500 font-medium border border-red-500/20'
                                      : 'text-white/30 border border-transparent hover:bg-white/[0.03] hover:text-white/60'
                                    }`}
                                >
                                  <span className="truncate">{opt}</span>
                                  {filters.include.includes(opt) && <Check size={9} />}
                                </button>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2 text-[9px]">
                              <button onClick={handleReset} className="px-4 py-1.5 uppercase tracking-widest text-white/20 hover:text-white transition-colors">Reset</button>
                              <button onClick={() => setOpenDropdown(null)} className="px-5 py-1.5 bg-white/5 border border-white/10 text-white uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all">Close</button>
                            </div>
                          </div>
                        )}

                        {dd.key === 'advanced' && (
                          <div className="w-[320px] p-2 space-y-3">
                            <div className="flex gap-2">
                              {['season', 'year'].map(key => (
                                <div key={key} className="flex-1">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">{key}</label>
                                  <div className="relative">
                                    <select 
                                      value={filters[key]} 
                                      onChange={(e) => setSingleFilter(key, e.target.value)}
                                      className="w-full h-7 bg-white/[0.03] border border-white/5 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/[0.06] transition-all cursor-pointer appearance-none"
                                    >
                                      <option value="" className="bg-[#0d0d0d]">{key === 'season' ? 'Season' : 'Year'}</option>
                                      {key === 'season' 
                                        ? ["WINTER", "SPRING", "SUMMER", "FALL"].map(s => <option key={s} value={s} className="bg-[#0d0d0d]">{s}</option>)
                                        : Array.from({length: 45}, (_, i) => 2026-i).map(y => <option key={y} value={y} className="bg-[#0d0d0d]">{y}</option>)
                                      }
                                    </select>
                                    <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-1">
                              <div className="space-y-1.5">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">Country</label>
                                <div className="space-y-1 px-0.5">
                                  {[{label:"China", v:"CN"}, {label:"Japan", v:"JP"}].map(c => (
                                    <button key={c.v} onClick={() => toggleFilter('country', c.v)} className="flex items-center gap-1.5 group w-full py-0.5">
                                      <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.country.includes(c.v) ? 'bg-red-600 border-red-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                        {filters.country.includes(c.v) && <Check size={7} strokeWidth={4} className="text-white" />}
                                      </div>
                                      <span className={`text-[10px] transition-colors ${filters.country.includes(c.v) ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>{c.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">Language</label>
                                <div className="space-y-1 px-0.5">
                                  {[
                                    {label: "Sub", v: "SUB"},
                                    {label: "Dub", v: "DUB"}
                                  ].map(l => (
                                    <label key={l.v} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group transition-colors">
                                      <div 
                                        onClick={() => toggleFilter('language', l.v)}
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                          filters.language.includes(l.v) ? 'bg-red-600 border-red-600' : 'border-white/20 group-hover:border-white/40'
                                        }`}
                                      >
                                        {filters.language.includes(l.v) && <Check size={10} strokeWidth={3} />}
                                      </div>
                                      <span className={`text-[10px] font-medium transition-colors ${
                                        filters.language.includes(l.v) ? 'text-white' : 'text-white/40 group-hover:text-white/60'
                                      }`}>
                                        {l.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                              <button 
                                onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")} 
                                className="flex items-center gap-1.5 group py-1"
                              >
                                <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.excludeMyList ? 'bg-red-600 border-red-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                  {filters.excludeMyList && <Check size={7} strokeWidth={4} className="text-white" />}
                                </div>
                                <span className={`text-[10px] transition-colors ${filters.excludeMyList ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>Exclude my list</span>
                              </button>
                              <div className="flex gap-2">
                                <button onClick={handleReset} className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">Reset</button>
                                <button onClick={() => setOpenDropdown(null)} className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all">Close</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <button
                onClick={handleShuffleSort}
                className="w-16 h-full flex items-center justify-center transition-all hover:bg-white/[0.04] text-white/20 hover:text-red-500 border-r border-white/5"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={() => refetch()}
                className="px-10 bg-red-600 text-white flex items-center gap-4 rounded-r-xl group active:scale-95 transition-all overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                <span className="text-[13px] font-normal uppercase tracking-[0.2em] relative z-10">Sync</span>
                <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            <div className="bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl p-3 space-y-3">
              <div className="relative h-10 flex items-center border border-white/5 rounded-lg">
                <Search className="absolute left-3 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Universal Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-full bg-transparent pl-10 pr-9 text-[12px] text-white font-medium placeholder-white/20 outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={12} className="text-white/40" />
                  </button>
                )}
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                {[
                  { label: "Types", key: "types", options: [{ label: "TV", value: "TV" }, { label: "Movie", value: "MOVIE" }, { label: "OVA", value: "OVA" }, { label: "ONA", value: "ONA" }, { label: "Special", value: "SPECIAL" }] },
                  { label: "Genres", key: "genre", options: ALL_GENRES },
                  { label: "Status", key: "status", options: [{ label: "Any", value: "" }, { label: "Releasing", value: "RELEASING" }, { label: "Finished", value: "FINISHED" }, { label: "Upcoming", value: "NOT_YET_RELEASED" }] },
                  { label: "Advanced", key: "advanced", active: filters.year || filters.season || filters.rating }
                ].map(dd => (
                  <div key={dd.key} className={`${dd.key === "genre" ? "static group" : "relative group"}`}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === dd.key ? null : dd.key)}
                      className={`w-full h-10 flex items-center justify-between px-4 rounded-lg border border-white/10 bg-black/20 transition-all hover:bg-white/[0.03] ${openDropdown === dd.key ? "bg-white/[0.06]" : ""}`}
                    >
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-medium transition-colors ${dd.active ? "text-red-500" : "text-white/50"}`}>
                        {dd.label}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`text-white/30 transition-transform duration-300 ${openDropdown === dd.key ? "rotate-180 text-red-500" : ""}`}
                      />
                    </button>

                    {openDropdown === dd.key && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setOpenDropdown(null)} />
                        <div
                          className={`absolute top-full mt-2 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.8)] p-1.5 z-[100] ${
                            dd.key === "genre"
                              ? "left-0 right-0 w-auto max-h-[70vh] overflow-y-auto"
                              : dd.key === "advanced"
                              ? "right-0 w-80"
                              : "left-0 w-40"
                          }`}
                        >
                          {(dd.key === "types" || dd.key === "status") && (
                            <div className="flex flex-col gap-0.5">
                              {dd.options.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    toggleFilter(dd.key === "types" ? "format" : "status", opt.value);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full px-3 py-1.5 rounded-lg text-left text-[11px] transition-all flex items-center justify-between group ${
                                    dd.key === "types" ? (filters.formats.includes(opt.value) ? "bg-red-600/10 text-red-500 font-medium" : "text-white/40 hover:bg-white/[0.03] hover:text-white")
                                    : filters.status === opt.value
                                    ? "bg-red-600/10 text-red-500 font-medium"
                                    : "text-white/40 hover:bg-white/[0.03] hover:text-white"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {(dd.key === "types" ? filters.formats.includes(opt.value) : filters.status === opt.value) && <Check size={10} />}
                                </button>
                              ))}
                            </div>
                          )}

                          {dd.key === "genre" && (
                            <div className="space-y-3 p-1">
                              <div className="grid grid-cols-3 gap-1">
                                {dd.options.map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => toggleGenre(opt)}
                                    className={`px-2 py-1.5 rounded text-left text-[10px] transition-all flex items-center justify-between group ${
                                      filters.include.includes(opt)
                                        ? "bg-red-600/10 text-red-500 font-medium border border-red-500/20"
                                        : "text-white/30 border border-transparent hover:bg-white/[0.03] hover:text-white/60"
                                    }`}
                                  >
                                    <span className="truncate">{opt}</span>
                                    {filters.include.includes(opt) && <Check size={9} />}
                                  </button>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2 text-[9px]">
                                <button
                                  onClick={handleReset}
                                  className="px-4 py-1.5 uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                                >
                                  Reset
                                </button>
                                <button
                                  onClick={() => setOpenDropdown(null)}
                                  className="px-5 py-1.5 bg-white/5 border border-white/10 text-white uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}

                          {dd.key === "advanced" && (
                            <div className="w-[320px] max-w-[calc(100vw-32px)] p-2 space-y-3">
                              <div className="flex gap-2">
                                {["season", "year"].map(key => (
                                  <div key={key} className="flex-1">
                                    <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] mb-1 px-1 font-bold">
                                      {key}
                                    </label>
                                    <div className="relative">
                                      <select
                                        value={filters[key]}
                                        onChange={e => setSingleFilter(key, e.target.value)}
                                        className="w-full h-7 bg-white/[0.03] border border-white/5 rounded-md px-2 pr-6 text-[10px] text-white/80 outline-none hover:bg-white/[0.06] transition-all cursor-pointer appearance-none"
                                      >
                                        <option value="" className="bg-[#0d0d0d]">
                                          {key === "season" ? "Season" : "Year"}
                                        </option>
                                        {key === "season"
                                          ? ["WINTER", "SPRING", "SUMMER", "FALL"].map(s => (
                                              <option key={s} value={s} className="bg-[#0d0d0d]">
                                                {s}
                                              </option>
                                            ))
                                          : Array.from({ length: 45 }, (_, i) => 2026 - i).map(y => (
                                              <option key={y} value={y} className="bg-[#0d0d0d]">
                                                {y}
                                              </option>
                                            ))}
                                      </select>
                                      <ChevronDown
                                        size={8}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-2 gap-3 pb-1">
                                <div className="space-y-1.5">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">
                                    Country
                                  </label>
                                  <div className="space-y-1 px-0.5">
                                    {[{ label: "China", v: "CN" }, { label: "Japan", v: "JP" }].map(c => (
                                      <button
                                        key={c.v}
                                        onClick={() => toggleFilter("country", c.v)}
                                        className="flex items-center gap-1.5 group w-full py-0.5"
                                      >
                                        <div
                                          className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${
                                            filters.country.includes(c.v)
                                              ? "bg-red-600 border-red-600"
                                              : "bg-white/5 border-white/10 group-hover:border-white/20"
                                          }`}
                                        >
                                          {filters.country.includes(c.v) && (
                                            <Check size={7} strokeWidth={4} className="text-white" />
                                          )}
                                        </div>
                                        <span
                                          className={`text-[10px] transition-colors ${
                                            filters.country.includes(c.v)
                                              ? "text-white/90"
                                              : "text-white/30 group-hover:text-white/50"
                                          }`}
                                        >
                                          {c.label}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-[7px] text-white/20 uppercase tracking-[0.2em] px-1 font-bold">
                                    Language
                                  </label>
                                  <div className="space-y-1 px-0.5">
                                    {[{ label: "Sub", v: "SUB" }, { label: "Dub", v: "DUB" }].map(l => (
                                      <label
                                        key={l.v}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group transition-colors"
                                      >
                                        <div
                                          onClick={() => toggleFilter("language", l.v)}
                                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                            filters.language.includes(l.v)
                                              ? "bg-red-600 border-red-600"
                                              : "border-white/20 group-hover:border-white/40"
                                          }`}
                                        >
                                          {filters.language.includes(l.v) && <Check size={10} strokeWidth={3} />}
                                        </div>
                                        <span
                                          className={`text-[10px] font-medium transition-colors ${
                                            filters.language.includes(l.v)
                                              ? "text-white"
                                              : "text-white/40 group-hover:text-white/60"
                                          }`}
                                        >
                                          {l.label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                <button
                                  onClick={() => setSingleFilter("onList", filters.excludeMyList ? "" : "false")}
                                  className="flex items-center gap-1.5 group py-1"
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${
                                      filters.excludeMyList ? "bg-red-600 border-red-600" : "bg-white/5 border-white/10 group-hover:border-white/20"
                                    }`}
                                  >
                                    {filters.excludeMyList && (
                                      <Check size={7} strokeWidth={4} className="text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] transition-colors ${
                                      filters.excludeMyList
                                        ? "text-white/90"
                                        : "text-white/30 group-hover:text-white/50"
                                    }`}
                                  >
                                    Exclude my list
                                  </span>
                                </button>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleReset}
                                    className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => setOpenDropdown(null)}
                                    className="px-4 py-1 bg-white/5 border border-white/10 text-white/60 text-[9px] uppercase tracking-[0.2em] rounded-md hover:bg-white/10 transition-all"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShuffleSort}
                  className="flex-1 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-red-500 hover:bg-white/10 transition-all"
                >
                  <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => refetch()}
                  className="flex-[2] h-10 bg-red-600 text-white flex items-center justify-center gap-3 rounded-lg active:scale-95 transition-all overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  <span className="text-[11px] font-normal uppercase tracking-[0.2em] relative z-10">Sync</span>
                  <ArrowRight size={14} className="relative z-10" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(filters.include.length + filters.exclude.length + filters.formats.length + (filters.status ? 1 : 0) + (filters.year ? 1 : 0)) > 0 && (
              <>
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-white/40 hover:text-red-500 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all mr-2">
                  <Trash2 size={10} /> Reset
                </button>
                {filters.include.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-red-600/10 border border-red-600/30 rounded-full text-[9px] text-red-500 font-bold uppercase tracking-widest transition-all">
                    {g}
                    <X size={10} className="cursor-pointer text-red-500/50 group-hover:text-red-500" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.exclude.map(g => (
                  <div key={g} className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-white/30 font-bold uppercase tracking-widest">
                    <span className="line-through">{g}</span>
                    <X size={10} className="cursor-pointer text-white/20 group-hover:text-white" onClick={() => toggleGenre(g)} />
                  </div>
                ))}
                {filters.formats.map(f => (
                  <div key={f} className="group flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 rounded-full text-[9px] text-blue-500 font-bold uppercase tracking-widest">
                    {f}
                    <X size={10} className="cursor-pointer text-blue-500/50 group-hover:text-blue-500" onClick={() => toggleFilter('formats', f)} />
                  </div>
                ))}
                {filters.status && (
                  <div className="group flex items-center gap-2 px-3 py-1.5 bg-green-600/10 border border-green-600/30 rounded-full text-[9px] text-green-500 font-bold uppercase tracking-widest">
                    {filters.status.replace('_', ' ')}
                    <X size={10} className="cursor-pointer text-green-500/50 group-hover:text-green-500" onClick={() => setSingleFilter('status', '')} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="relative min-h-[500px]">
          {(isLoading || (isFetching && animeList.length === 0)) ? (
            <div className="grid grid-cols-6 gap-x-5 gap-y-10 opacity-40">
              {Array.from({ length: 36 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : animeList.length > 0 ? (
            <div className="grid grid-cols-6 gap-x-5 gap-y-10">
              {animeList.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-48 text-center">
              <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mb-10 shadow-inner group">
                <Search size={32} className="text-white/10 group-hover:text-red-500 transition-colors" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight mb-4">No results found</h3>
              <p className="text-white/40 max-w-sm text-sm mb-12 leading-relaxed font-medium">We couldn't find anything matching your exact filter setup. Try relaxing your constraints.</p>
              <button
                onClick={handleReset}
                className="px-12 py-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold uppercase tracking-[0.3em] rounded-full transition-all shadow-2xl shadow-red-600/30 active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Persistent Pagination */}
        {result.pageInfo?.lastPage > 1 && (
          <div className={`mt-24 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Pagination currentPage={filters.page} totalPages={result.pageInfo.lastPage} onPageChange={handlePageChange} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
