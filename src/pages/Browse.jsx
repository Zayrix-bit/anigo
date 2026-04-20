import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBrowseAnime, getBrowseAnimeMAL } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Search, ChevronDown, Filter, Check, X, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { ALL_GENRES, OFFICIAL_GENRES, GENRE_MAP } from "../constants/genres";
import Pagination from "../components/common/Pagination";

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
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

  const { data: result = { media: [], pageInfo: { total: 0 } }, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["browse", filters],
    queryFn: () => {
      if (filters.include.includes("Avant Garde")) {
        return getBrowseAnimeMAL({
          page: filters.page,
          genres: filters.include,
          search: filters.search,
          status: filters.status,
          sort: filters.sort
        });
      }

      const vars = {
        page: filters.page,
        perPage: 48,
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
      if (filters.country.length > 0) vars.country = filters.country[0]; // AniList takes single CountryCode
      if (filters.rating) vars.averageScore_greater = parseInt(filters.rating);

      return getBrowseAnime(vars);
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  const animeList = useMemo(() => {
    const rawList = result.media || [];
    if (filters.include.length === 0 && filters.exclude.length === 0) return rawList;
    return rawList.filter(anime => {
      const allLabels = [...(anime.genres || []), ...(anime.tags || []).map(t => t.name)];
      if (filters.exclude.some(ex => allLabels.includes(GENRE_MAP[ex] || ex))) return false;
      if (filters.include.length > 0) {
        if (!filters.include.some(inc => allLabels.includes(GENRE_MAP[inc] || inc))) return false;
      }
      return true;
    });
  }, [result.media, filters.include, filters.exclude]);

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
    setIsMobileFilterOpen(false);
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

      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 md:hidden">
        <div className="px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-red-500" />
            <h1 className="text-[12px] font-bold tracking-[0.2em] text-white/90 uppercase">Browse</h1>
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-all"
          >
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
          </button>
        </div>
      </header>

      <main className="container max-w-[1720px] mx-auto px-2 md:px-4 pt-16 md:pt-20 pb-20">

        {/* Page Head - Ultra Compact */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-red-600 rounded-full shrink-0" />
            <h2 className="text-2xl font-normal tracking-tighter">Browse</h2>
          </div>
        </div>

        {/* Desktop Interface - Ultra Compact Margin */}
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
                        dd.key === 'genre' ? 'w-[540px] left-1/2 -translate-x-1/2' : 
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
                                    {label:"Hard Sub", v:"HARD_SUB"}, 
                                    {label:"Soft Sub", v:"SOFT_SUB"}, 
                                    {label:"Dub", v:"DUB"}
                                  ].map(l => (
                                    <button key={l.v} onClick={() => toggleFilter('language', l.v)} className="flex items-center gap-1.5 group w-full py-0.5">
                                      <div className={`w-2.5 h-2.5 rounded-[2px] border transition-all flex items-center justify-center ${filters.language.includes(l.v) ? 'bg-red-600 border-red-600' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                        {filters.language.includes(l.v) && <Check size={7} strokeWidth={4} className="text-white" />}
                                      </div>
                                      <span className={`text-[10px] transition-colors ${filters.language.includes(l.v) ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'}`}>{l.label}</span>
                                    </button>
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

            {/* Precision Tokens */}
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

          {/* Mobile UI Bar */}
          <div className="md:hidden flex gap-3">
            <div className="flex-1 relative h-14 bg-[#121212] border border-white/5 rounded-2xl shadow-inner ring-1 ring-white/5 px-2 flex items-center">
              <Search className="ml-4 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent px-4 text-sm font-medium placeholder-white/20 outline-none"
              />
            </div>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="w-14 h-14 flex items-center justify-center bg-red-600 rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all outline-none"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="relative min-h-[500px]">
          {(isLoading || (isFetching && animeList.length === 0)) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-5 gap-y-10 opacity-40">
              {Array.from({ length: 48 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : animeList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-5 gap-y-10">
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

        {/* Improved Mobile Drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-[1000] md:hidden">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md transition-opacity" onClick={() => setIsMobileFilterOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[94vh] bg-[#0d0d0d] border-t border-white/10 rounded-t-[48px] p-8 pb-12 overflow-y-auto shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
              <div className="w-16 h-1 bg-white/10 rounded-full mx-auto mb-12" />

              <div className="flex items-center justify-between mb-12 px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold tracking-tight">Browse</h3>
                  <p className="text-red-500 text-[10px] font-bold uppercase tracking-[0.4em]">Personalize</p>
                </div>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl active:scale-90 transition-all border border-white/5"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>

              <div className="flex flex-col gap-12">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Status</label>
                    {filters.status && <button onClick={() => setSingleFilter('status', '')} className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Reset</button>}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {[{ l: "All", v: "" }, { l: "Airing", v: "RELEASING" }, { l: "Finished", v: "FINISHED" }, { l: "Soon", v: "NOT_YET_RELEASED" }].map(s => (
                      <button
                        key={s.v}
                        onClick={() => setSingleFilter('status', s.v)}
                        className={`flex-1 min-w-[80px] h-12 rounded-2xl text-xs font-bold border transition-all duration-300 ${filters.status === s.v ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-600/30' : 'bg-white/5 border-white/5 text-white/40'}`}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Format</label>
                    {filters.formats.length > 0 && <button onClick={() => setSingleFilter('format', '')} className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Reset</button>}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {["TV", "MOVIE", "OVA", "ONA", "SPECIAL"].map(f => (
                      <button
                        key={f}
                        onClick={() => toggleFilter('formats', f)}
                        className={`px-6 h-12 rounded-2xl text-xs font-bold border transition-all duration-300 ${filters.formats.includes(f) ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/40'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 px-1">
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Year</label>
                    <select value={filters.year} onChange={(e) => setSingleFilter('year', e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold outline-none ring-red-500/20 focus:ring-4 transition-all">
                      <option value="" className="bg-[#0d0d0d]">Any Year</option>
                      {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => <option key={y} value={y} className="bg-[#0d0d0d]">{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Season</label>
                    <select value={filters.season} onChange={(e) => setSingleFilter('season', e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold outline-none ring-red-500/20 focus:ring-4 transition-all">
                      <option value="" className="bg-[#0d0d0d]">Any Season</option>
                      {["WINTER", "SPRING", "SUMMER", "FALL"].map(s => <option key={s} value={s} className="bg-[#0d0d0d]">{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">Popular Genres</label>
                  <div className="flex flex-wrap gap-2.5">
                    {ALL_GENRES.slice(0, 24).map(g => {
                      const inClude = filters.include.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGenre(g)}
                          className={`px-5 py-3 rounded-full text-[11px] font-bold border transition-all duration-300 ${inClude ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 text-white/40 active:bg-white/20'}`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={handleReset} className="flex-1 h-16 bg-white/5 text-white text-xs font-bold uppercase tracking-widest rounded-3xl active:scale-95 transition-all">Reset All</button>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="flex-[2] h-16 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-3xl shadow-2xl shadow-red-600/30 active:scale-95 transition-all">Sync Results</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
