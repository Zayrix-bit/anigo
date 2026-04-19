import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBrowseAnime, getBrowseAnimeMAL } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Search, ChevronDown, ArrowDownUp, Filter, ChevronRight, ChevronLeft, Check, X, ChevronsRight, ChevronsLeft, Feather, Target, Calendar } from "lucide-react";
import { ALL_GENRES, OFFICIAL_GENRES, GENRE_MAP } from "../constants/genres";

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = useMemo(() => {
    const genreStr = searchParams.get("genre") || "";
    const excludeStr = searchParams.get("exclude") || "";
    const formatParams = searchParams.getAll("format");

    return {
      search: searchParams.get("search") || "",
      include: genreStr ? genreStr.split(",").filter(Boolean) : [],
      exclude: excludeStr ? excludeStr.split(",").filter(Boolean) : [],
      formats: formatParams,
      status: searchParams.get("status") || "",
      sort: searchParams.get("sort") || "TRENDING_DESC",
      year: searchParams.get("year") || null,
      season: searchParams.get("season") || null,
      country: searchParams.get("country") || "",
      rating: searchParams.get("rating") || null,
      language: searchParams.getAll("language"),
      excludeMyList: searchParams.get("excludeMyList") === "true",
    };
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1"));

  // Sync internal search input with URL (e.g., when clearing/resetting)
  useEffect(() => {
    const fromUrl = searchParams.get("search") || "";
    if (fromUrl !== searchInput) setSearchInput(fromUrl);
  }, [searchParams]);

  // Sync page state when URL changes
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1");
    if (p !== page) setPage(p);
  }, [searchParams]);

  // Update URL when page changes
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage);
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [openDropdown, setOpenDropdown] = useState(null);
  const [consecutiveEmptyPages, setConsecutiveEmptyPages] = useState(0);

  // Debounce search query to URL - Optimized to avoid conflicts
  useEffect(() => {
    const currentUrlSearch = searchParams.get("search") || "";
    if (searchInput === currentUrlSearch) return;
    
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (!searchInput) next.delete("search");
        else next.set("search", searchInput);
        next.set("page", "1");
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Lock body scroll when any filter dropdown is open on mobile
  useEffect(() => {
    // Lock if any dropdown is open AND we are on a mobile screen
    if (openDropdown && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      // Optional: Add a small padding to prevent layout shift if needed
      document.body.style.touchAction = 'none'; 
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }
    
    return () => { 
      document.body.style.overflow = 'unset'; 
      document.body.style.touchAction = 'auto';
    };
  }, [openDropdown]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown-container")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Genre data is now handled via the hardcoded ALL_GENRES list with Smart Mapping */

  // Fetch Browse Results
  const { data: result = { media: [], pageInfo: { total: 0 } }, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["browse", page, filters.search, filters.formats, filters.include, filters.exclude, filters.status, filters.sort, filters.year, filters.season, filters.country, filters.rating],
    queryFn: () => {
      // Hybrid Switch: Use MAL (Jikan) for Avant Garde
      if (filters.include.includes("Avant Garde")) {
        return getBrowseAnimeMAL({
          page: page,
          genres: filters.include,
          search: filters.search,
          status: filters.status,
          sort: filters.sort
        });
      }

      const variables = {
        page: page,
        perPage: 50,
        sort: [filters.sort],
      };
      if (filters.search.trim()) variables.search = filters.search;
      if (filters.formats.length > 0) variables.format_in = filters.formats;
      
      // Keep API-side filtering for base results (inclusive)
      if (filters.include.length > 0) {
        const genre_in = [];
        const tag_in = [];
        filters.include.forEach(g => {
          const mappedName = GENRE_MAP[g] || g;
          if (OFFICIAL_GENRES.includes(mappedName)) genre_in.push(mappedName);
          else tag_in.push(mappedName);
        });
        if (genre_in.length > 0) variables.genre_in = genre_in;
        if (tag_in.length > 0) variables.tag_in = tag_in;
      }

      if (filters.status) variables.status = filters.status;
      if (filters.year) variables.seasonYear = parseInt(filters.year);
      if (filters.season) variables.season = filters.season;
      if (filters.country) variables.country = filters.country;
      if (filters.rating) variables.averageScore_greater = parseInt(filters.rating);
      
      console.info("[AniList] Browse Variables (50 items):", variables);
      return getBrowseAnime(variables);
    },
    enabled: true,
  });

  // --- Filtering Logic (AFTER fetch) ---
  const animeList = useMemo(() => {
    const rawList = result.media || [];
    if (filters.include.length === 0 && filters.exclude.length === 0) return rawList;

    return rawList.filter(anime => {
      // Get official genres and tags from the anime
      const animeGenres = anime.genres || [];
      const animeTags = anime.tags?.map(t => t.name) || [];
      const allAnimeLabels = [...animeGenres, ...animeTags];
      
      // Step 1: Exclude Logic
      const isExcluded = filters.exclude.some(excl => {
        const mappedExcl = GENRE_MAP[excl] || excl;
        return allAnimeLabels.includes(mappedExcl);
      });
      if (isExcluded) return false;

      // Step 2: Include Logic (OR)
      if (filters.include.length > 0) {
        const isIncluded = filters.include.some(incl => {
          const mappedIncl = GENRE_MAP[incl] || incl;
          return allAnimeLabels.includes(mappedIncl);
        });
        if (!isIncluded) return false;
      }

      return true;
    });
  }, [result.media, filters.include, filters.exclude]);

  const totalCount = result.pageInfo?.total || 0;
  const hasNextPage = result.pageInfo?.hasNextPage || false;

  // Fix: Auto-move to next page if current filtered list is empty (with safety break)
  useEffect(() => {
    // If we've successfully loaded items, reset the empty page counter
    if (!isLoading && !isFetching && animeList.length > 0) {
      setConsecutiveEmptyPages(0);
      return;
    }

    // Circuit Breaker: If we've jumped 5 times and still find nothing, stop jumping
    if (!isLoading && !isFetching && animeList.length === 0 && hasNextPage) {
      if (consecutiveEmptyPages >= 5) {
        console.warn("[Browse] Safety break triggered: Too many empty pages. Stopping auto-jump.");
        return;
      }
      
      console.info(`[Browse] Filtered to empty (Jump ${consecutiveEmptyPages + 1}/5), moving to page:`, page + 1);
      setConsecutiveEmptyPages(prev => prev + 1);
      handlePageChange(page + 1);
    }
  }, [animeList, isLoading, isFetching, hasNextPage]);


  const toggleGenre = (genre) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const include = next.get("genre")?.split(",").filter(Boolean) || [];
      const exclude = next.get("exclude")?.split(",").filter(Boolean) || [];

      // Logic Cycle: Neutral -> Include -> Exclude -> Neutral
      if (include.includes(genre)) {
        // Switch to Exclude
        const newInclude = include.filter(g => g !== genre);
        const newExclude = [...exclude, genre];
        
        if (newInclude.length > 0) next.set("genre", newInclude.join(",")); else next.delete("genre");
        next.set("exclude", newExclude.join(","));
      } else if (exclude.includes(genre)) {
        // Switch to Neutral (Remove)
        const newExclude = exclude.filter(g => g !== genre);
        if (newExclude.length > 0) next.set("exclude", newExclude.join(",")); else next.delete("exclude");
      } else {
        // Switch to Include
        const newInclude = [...include, genre];
        next.set("genre", newInclude.join(","));
      }

      next.set("page", "1");
      return next;
    });
  };

  const toggleFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // Map plural state keys to singular URL keys
      const keyMap = {
        formats: "format",
        language: "language"
      };
      const urlKey = keyMap[key] || key;
      
      const currentValues = next.getAll(urlKey);
      const isSelected = currentValues.includes(value);
      const nextValues = isSelected 
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      next.delete(urlKey);
      nextValues.forEach(v => next.append(urlKey, v));
      next.set("page", "1");
      return next;
    });
  };

  const handleSingleSelect = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      next.set("page", "1");
      return next;
    });
  };

  const loading = isLoading || isFetching;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!searchInput) next.delete("search");
      else next.set("search", searchInput);
      next.set("page", "1");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-24 pb-12">
        {/* Header Title & Result Count */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[14px] font-semibold uppercase tracking-[0.2em] text-white opacity-60">
            BROWSER
          </h1>
          {!isLoading && (
            <span className="text-[10px] font-bold text-white/40 bg-white/[0.03] px-2 py-1 rounded border border-white/5 uppercase tracking-wider">
              {totalCount.toLocaleString()} Anime
            </span>
          )}
        </div>

        {/* Mobile Filter Grid (Always Visible as requested) */}
        <div className="md:hidden grid grid-cols-2 bg-[#121212] border border-white/5 rounded-[4px] overflow-hidden mb-8 filter-dropdown-container relative">
            {/* Row 1: Search (Sub) & Type */}
            <div className="border-r border-b border-white/5 p-3 relative h-12 flex items-center">
               <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent text-[12px] text-white placeholder-white/20 outline-none"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 w-3 h-3" />
            </div>
            <button 
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              className="border-b border-white/5 p-3 h-12 flex items-center justify-between text-[12px] text-white/40"
            >
              <span>{filters.formats.length > 0 ? `Format (${filters.formats.length})` : 'Type'}</span>
              <ChevronDown className="w-3 h-3 text-white/20" />
            </button>

            {/* Row 2: Genre & Status */}
            <button 
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
              className="border-r border-b border-white/5 p-3 h-12 flex items-center justify-between text-[12px] text-white/40"
            >
              <span>{filters.include.length > 0 || filters.exclude.length > 0 ? `Genres (${filters.include.length + filters.exclude.length})` : 'Genre'}</span>
              <ChevronDown className="w-3 h-3 text-white/20" />
            </button>
            <button 
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className="border-b border-white/5 p-3 h-12 flex items-center justify-between text-[12px] text-white/40"
            >
              <span>{filters.status ? 'Status' : 'Status'}</span>
              <ChevronDown className="w-3 h-3 text-white/20" />
            </button>

            {/* Row 3: Updated Date (Year) & Action Row */}
            <div className="border-r border-white/5 relative">
              <button 
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                className="w-full p-3 h-12 flex items-center justify-between text-[12px] text-white/40"
              >
                <span>{filters.year || 'Updated date'}</span>
                <ChevronDown className="w-3 h-3 text-white/20" />
              </button>
              
              {/* Mobile Year Dropdown */}
              {openDropdown === 'year' && (
                <div className="fixed inset-x-4 top-[350px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-4 z-[110] max-h-[40vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 25 }, (_, i) => 2026 - i).map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => { handleSingleSelect('year', year.toString()); setOpenDropdown(null); }}
                        className={`py-2 text-[11px] rounded border transition-colors ${
                          filters.year === year.toString() ? 'bg-red-600 border-red-600 text-white' : 'bg-white/[0.03] border-white/5 text-white/40'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex h-12">
               <button 
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className={`flex-1 p-3 flex items-center justify-center border-r border-white/5 transition-colors ${openDropdown === 'sort' ? 'bg-white/10' : ''}`}
              >
                <ArrowDownUp className="w-3 h-3 text-white/50" />
              </button>
              <button 
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="flex-[3] bg-red-600 flex items-center justify-center gap-2 text-white font-bold text-[12px]"
              >
                <Feather className="w-3.5 h-3.5 fill-current" />
                <span>Filter</span>
              </button>
            </div>

            {/* Mobile Dropdown Overlays (Reusable Content logic but absolute to mobile items) */}
            {openDropdown === 'type' && (
              <div className="fixed inset-x-4 top-[250px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-4 z-[110] animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  {["MOVIE", "TV", "OVA", "ONA", "SPECIAL", "MUSIC"].map(format => {
                    const isSelected = filters.formats.includes(format);
                    return (
                      <button 
                        key={format} 
                        type="button"
                        onClick={() => toggleFilter('formats', format)}
                        className={`flex items-center gap-3 p-3 rounded bg-white/[0.03] border border-white/5 ${isSelected ? 'border-white/20 bg-white/[0.05]' : ''}`}
                      >
                        <div className={`w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center transition-colors ${isSelected ? 'bg-white border-white' : 'border-white/20'}`} />
                        <span className={`text-[12px] opacity-70 ${isSelected ? 'text-white' : ''}`}>{format}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {openDropdown === 'genre' && (
              <div className="fixed inset-x-6 top-[180px] max-h-[50vh] bg-[#121212] border border-white/5 rounded-[8px] shadow-2xl p-5 z-[110] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] font-bold uppercase tracking-widest text-white/40">Select Genres</span>
                  <div className="flex gap-4">
                    {(filters.include.length > 0 || filters.exclude.length > 0) && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            next.delete("genre");
                            next.delete("exclude");
                            return next;
                          });
                        }}
                        className="text-[10px] text-red-500 font-bold uppercase"
                      >
                        Clear All
                      </button>
                    )}
                    <button onClick={() => setOpenDropdown(null)} className="text-[10px] text-white/60 font-bold uppercase">Close</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {ALL_GENRES.map(g => {
                    const isIncluded = filters.include.includes(g);
                    const isExcluded = filters.exclude.includes(g);
                    return (
                      <button key={g} type="button" onClick={() => toggleGenre(g)} className="flex items-center gap-3 py-1">
                        <div className={`w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center shrink-0 ${isIncluded ? 'bg-red-600 border-red-600' : isExcluded ? 'bg-white/10 border-white/30' : 'border-white/20'}`}>
                          {isIncluded && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                          {isExcluded && <X className="w-2.5 h-2.5 text-red-500" strokeWidth={4} />}
                        </div>
                        <span className={`text-[12px] truncate ${isIncluded ? 'text-white font-bold' : isExcluded ? 'text-white/30 line-through' : 'text-white/50'}`}>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {openDropdown === 'status' && (
              <div className="fixed inset-x-4 top-[300px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl overflow-hidden z-[110] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col">
                  {['', 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED'].map(val => (
                    <button 
                      key={val} 
                      type="button"
                      onClick={() => { handleSingleSelect('status', val); setOpenDropdown(null); }}
                      className={`px-4 py-4 text-[12px] text-left border-b border-white/5 ${filters.status === val ? 'bg-red-600 text-white font-bold' : 'text-white/40 font-medium'}`}
                    >
                      {val === '' ? 'All Status' : val.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {openDropdown === 'sort' && (
              <div className="fixed inset-x-4 top-[300px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl overflow-hidden z-[110] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col">
                  {[
                    { label: 'Trending', value: 'TRENDING_DESC' },
                    { label: 'Popularity', value: 'POPULARITY_DESC' },
                    { label: 'Highest Score', value: 'SCORE_DESC' },
                    { label: 'Recently Added', value: 'ID_DESC' }
                  ].map(s => (
                    <button 
                      key={s.value} 
                      type="button"
                      onClick={() => { handleSingleSelect('sort', s.value); setOpenDropdown(null); }}
                      className={`px-4 py-4 text-[12px] text-left border-b border-white/5 ${filters.sort === s.value ? 'bg-red-600 text-white font-bold' : 'text-white/40 font-medium'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        
        {/* Pixel-Matched Filter Bar (Desktop Only) */}
        <form 
          onSubmit={handleSubmit}
          className="hidden md:flex items-stretch mb-10 bg-[#121212] border border-white/5 rounded-[4px] h-10 relative filter-dropdown-container"
        >
          {/* Search Input */}
          <div className="relative flex-[1.5] border-r border-white/5 group">
            <input
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-full bg-transparent px-3 text-[12px] text-white/50 placeholder-white/20 outline-none hover:bg-white/[0.02] transition-colors"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 w-3 h-3" />
          </div>

          {/* Type Dropdown */}
          <div className="relative flex-1 border-r border-white/5">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              className="w-full h-full flex items-center justify-between px-3 text-[12px] text-white/40 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">
                {filters.formats.length > 0 ? `Type (${filters.formats.length})` : 'Type'}
              </span>
              <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'type' && (
              <div className="absolute top-[44px] left-0 w-48 bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-3 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-2.5">
                  {["MOVIE", "TV", "OVA", "ONA", "SPECIAL", "MUSIC"].map(format => {
                    const isSelected = filters.formats.includes(format);
                    return (
                      <button 
                        key={format} 
                        type="button"
                        onClick={() => toggleFilter('formats', format)}
                        className="flex items-center gap-3 w-full group text-left"
                      >
                        <div className={`w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white border-white' : 'bg-transparent border-white/20 group-hover:border-white/40'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-[#121212]" style={{ clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />}
                        </div>
                        <span className={`text-[12px] transition-colors ${isSelected ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>
                          {format.charAt(0) + format.slice(1).toLowerCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Genre Dropdown */}
          <div className="relative flex-1 border-r border-white/5">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
              className="w-full h-full flex items-center justify-between px-3 text-[12px] text-white/40 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">
                {filters.include.length > 0 || filters.exclude.length > 0 ? `Genres (${filters.include.length + filters.exclude.length})` : 'Genres'}
              </span>
              <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${openDropdown === 'genre' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'genre' && (
              <div className="absolute top-[44px] left-[-100px] md:left-0 w-[380px] md:w-[650px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
                {/* Grid Container (No Scroll) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  {ALL_GENRES.map(g => {
                    const isIncluded = filters.include.includes(g);
                    const isExcluded = filters.exclude.includes(g);
                    
                    return (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className="flex items-center gap-3 group text-left py-0.5"
                      >
                        <div className={`w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center transition-colors shrink-0 ${
                          isIncluded ? 'bg-red-600 border-red-600' : 
                          isExcluded ? 'bg-white/10 border-white/30' : 
                          'bg-transparent border-white/20 group-hover:border-white/40'
                        }`}>
                          {isIncluded && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                          {isExcluded && <X className="w-2.5 h-2.5 text-red-500" strokeWidth={4} />}
                        </div>
                        <span className={`text-[12px] truncate transition-colors ${
                          isIncluded ? 'text-white font-bold' : 
                          isExcluded ? 'text-white/40 line-through' :
                          'text-gray-400 group-hover:text-white'
                        }`}>
                          {g}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend & Actions */}
                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 opacity-40">
                      <div className="w-3 h-3 border border-white/30 rounded-sm flex items-center justify-center bg-red-600 border-red-600">
                        <Check className="w-2 h-2 text-white" strokeWidth={4} />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-tight">Included</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <div className="w-3 h-3 border border-white/30 rounded-sm flex items-center justify-center bg-white/10">
                        <X className="w-2 h-2 text-red-500" strokeWidth={4} />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-tight">Excluded</span>
                    </div>
                  </div>

                  {(filters.include.length > 0 || filters.exclude.length > 0) && (
                    <button 
                      type="button"
                      onClick={() => {
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete("genre");
                          next.delete("exclude");
                          return next;
                        });
                      }}
                      className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative flex-1 border-r border-white/5">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className="w-full h-full flex items-center justify-between px-3 text-[12px] text-white/40 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">
                {filters.status === 'RELEASING' ? 'Releasing' : 
                 filters.status === 'FINISHED' ? 'Completed' :
                 filters.status === 'NOT_YET_RELEASED' ? 'Upcoming' : 'Status'}
              </span>
              <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'status' && (
              <div className="absolute top-[44px] left-0 w-40 bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col py-1.5">
                  {[
                    { label: 'All Status', value: '' },
                    { label: 'Releasing', value: 'RELEASING' },
                    { label: 'Completed', value: 'FINISHED' },
                    { label: 'Upcoming', value: 'NOT_YET_RELEASED' }
                  ].map(s => {
                    const isActive = filters.status === s.value;
                    return (
                      <button 
                        key={s.value}
                        type="button"
                        onClick={() => {
                          handleSingleSelect('status', s.value);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isActive ? 'bg-red-600' : 'hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border border-white/20 flex items-center justify-center transition-colors ${
                          isActive ? 'bg-white border-white' : 'bg-transparent'
                        }`}>
                          {isActive && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                        </div>
                        <span className={`text-[12px] ${
                          isActive ? 'text-white font-bold' : 'text-gray-400 font-medium'
                        }`}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filter Dropdown */}
          <div className="relative flex-1 border-l border-white/5 filter-dropdown-container ml-auto">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'advanced' ? null : 'advanced')}
              className="w-full h-full flex items-center justify-between px-3 text-[12px] text-white/40 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">
                {filters.year || filters.season || filters.country ? 'Filtered' : 'Advanced'}
              </span>
              <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${openDropdown === 'advanced' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'advanced' && (
              <div className="absolute top-[44px] right-0 w-[420px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-5 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col gap-6">
                  {/* Top Selects Row */}
                  <div className="flex gap-2">
                    {/* Season Select */}
                    <div className="flex-1 relative group">
                      <select 
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded px-3 py-1.5 text-[11px] text-gray-400 appearance-none focus:outline-none focus:border-white/20 transition-colors"
                        value={filters.season || ""}
                        onChange={(e) => handleSingleSelect('season', e.target.value || null)}
                      >
                        <option value="">Season</option>
                        <option value="WINTER">Winter</option>
                        <option value="SPRING">Spring</option>
                        <option value="SUMMER">Summer</option>
                        <option value="FALL">Fall</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>

                    {/* Year Select */}
                    <div className="flex-1 relative group">
                      <select 
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded px-3 py-1.5 text-[11px] text-gray-400 appearance-none focus:outline-none focus:border-white/20 transition-colors"
                        value={filters.year || ""}
                        onChange={(e) => handleSingleSelect('year', e.target.value || null)}
                      >
                        <option value="">Year</option>
                        {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>

                    {/* Rating Select */}
                    <div className="flex-1 relative group">
                      <select 
                        className="w-full bg-[#1a1a1a] border border-white/5 rounded px-3 py-1.5 text-[11px] text-gray-400 appearance-none focus:outline-none focus:border-white/20 transition-colors"
                        value={filters.rating || ""}
                        onChange={(e) => handleSingleSelect('rating', e.target.value || null)}
                      >
                        <option value="">Rating</option>
                        <option value="80">8.0+</option>
                        <option value="70">7.0+</option>
                        <option value="60">6.0+</option>
                        <option value="50">5.0+</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  </div>

                  {/* Country Section */}
                  <div className="space-y-3">
                    <span className="text-[12px] font-medium text-white/90">Country</span>
                    <div className="flex gap-6">
                      {[
                        { label: 'China', value: 'CN' },
                        { label: 'Japan', value: 'JP' }
                      ].map(c => {
                        const isActive = filters.country === c.value;
                        return (
                          <button 
                            key={c.value}
                            type="button"
                            onClick={() => handleSingleSelect('country', isActive ? "" : c.value)}
                            className="flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className={`w-3.5 h-3.5 rounded-sm border transition-all flex items-center justify-center ${
                              isActive ? 'bg-red-600 border-red-600' : 'bg-transparent border-white/20 group-hover:border-white/40'
                            }`}>
                              {isActive && <div className="w-1.5 h-[1.5px] bg-white rounded-full rotate-45 translate-y-[0.5px] translate-x-[-1px]" />}
                              {isActive && <div className="w-2 h-[1.5px] bg-white rounded-full -rotate-45 translate-y-[-1px] translate-x-[1px]" />}
                            </div>
                            <span className={`text-[11px] transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                              {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Language Section */}
                  <div className="space-y-3">
                    <span className="text-[12px] font-medium text-white/90">Language</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      {['Hard Sub', 'Soft Sub', 'Dub', 'Sub & Dub'].map(l => {
                        const isActive = filters.language.includes(l);
                        return (
                          <button 
                            key={l}
                            type="button"
                            onClick={() => toggleFilter('language', l)}
                            className="flex items-center gap-2.5 group cursor-pointer"
                          >
                            <div className={`w-3.5 h-3.5 rounded-sm border transition-all flex items-center justify-center ${
                              isActive ? 'bg-red-600 border-red-600' : 'bg-transparent border-white/20 group-hover:border-white/40'
                            }`}>
                              {isActive && <div className="w-1.5 h-[1.5px] bg-white rounded-full rotate-45 translate-y-[0.5px] translate-x-[-1px]" />}
                              {isActive && <div className="w-2 h-[1.5px] bg-white rounded-full -rotate-45 translate-y-[-1px] translate-x-[1px]" />}
                            </div>
                            <span className={`text-[11px] transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                              {l}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Extra Options Section */}
                  <div className="space-y-3">
                    <span className="text-[12px] font-medium text-white/90">Extra Options</span>
                    <button 
                      type="button"
                      onClick={() => handleSingleSelect('excludeMyList', !filters.excludeMyList)}
                      className="flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm border transition-all flex items-center justify-center ${
                        filters.excludeMyList ? 'bg-red-600 border-red-600' : 'bg-transparent border-white/20 group-hover:border-white/40'
                      }`}>
                        {filters.excludeMyList && <div className="w-1.5 h-[1.5px] bg-white rounded-full rotate-45 translate-y-[0.5px] translate-x-[-1px]" />}
                        {filters.excludeMyList && <div className="w-2 h-[1.5px] bg-white rounded-full -rotate-45 translate-y-[-1px] translate-x-[1px]" />}
                      </div>
                      <span className={`text-[11px] transition-colors ${filters.excludeMyList ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                        Exclude my list
                      </span>
                    </button>
                  </div>

                  <hr className="border-white/5 mt-2" />
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        ["year", "season", "country", "rating", "language", "excludeMyList", "genre", "exclude", "format"].forEach(k => next.delete(k));
                        next.set("page", "1");
                        return next;
                      });
                      setOpenDropdown(null);
                    }}
                    className="text-[11px] text-red-500 hover:text-red-400 transition-colors font-medium text-center"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Integrated Sort Control */}
          <div className="relative border-l border-white/5 filter-dropdown-container">
            <button 
              className={`flex items-center justify-center w-10 h-full transition-colors ${
                openDropdown === 'sort' ? 'bg-red-600 text-white' : 'bg-white/[0.03] hover:bg-white/[0.06] text-white/20'
              }`}
              onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
              title="Sort Options"
            >
              <ArrowDownUp className={`w-3.5 h-3.5 ${openDropdown === 'sort' ? 'text-white' : 'text-white/20'}`} />
            </button>

            {openDropdown === 'sort' && (
              <div className="absolute top-[44px] right-0 w-[220px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col py-2">
                  {[
                    { label: 'Updated date', value: 'UPDATED_AT_DESC' },
                    { label: 'Release date', value: 'START_DATE_DESC' },
                    { label: 'End date', value: 'END_DATE_DESC' },
                    { label: 'Added date', value: 'ID_DESC' },
                    { label: 'Trending', value: 'TRENDING_DESC' },
                    { label: 'Name A-Z', value: 'TITLE_ROMAJI' },
                    { label: 'Average score', value: 'SCORE_DESC' },
                    { label: 'Most viewed', value: 'POPULARITY_DESC' },
                    { label: 'Most followed', value: 'FAVOURITES_DESC' },
                    { label: 'Episode count', value: 'EPISODES_DESC' }
                  ].map(s => {
                    const isActive = filters.sort === s.value;
                    return (
                      <button 
                        key={s.value}
                        onClick={() => {
                          handleSingleSelect('sort', s.value);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isActive ? 'bg-red-600' : 'hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                          isActive ? 'bg-white border-white' : 'bg-transparent border-white/20'
                        }`}>
                          {isActive && <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />}
                        </div>
                        <span className={`text-[11px] font-medium whitespace-nowrap ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filter Action Button */}
          <button 
            className="flex items-center justify-center gap-2 px-6 h-full bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold transition-all active:scale-95 shrink-0"
            onClick={() => {
              setOpenDropdown(null);
              refetch();
            }}
          >
            <Filter size={13} fill="white" className="stroke-2" />
            Filter
          </button>
        </form>

        {/* Results Grid */}
        {loading && animeList.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-6 md:gap-8 gap-y-10 sm:gap-y-10">
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : animeList.length > 0 ? (
          <div className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-6 md:gap-8 gap-y-10 sm:gap-y-10 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 opacity-40">
            <p className="text-sm font-medium">No results found matching your selection.</p>
          </div>
        )}

        {/* Pagination Component */}
        {!isLoading && result.pageInfo?.lastPage > 1 && (
          <div className="mt-12 sm:mt-16 pb-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {/* Prev Button */}
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-[4px] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            {(() => {
              const lastPage = result.pageInfo.lastPage;
              let pages = [];
              
              // Smart Pagination Logic (Show 5 pages around current)
              let start = Math.max(1, page - 2);
              let end = Math.min(lastPage, start + 4);
              if (end === lastPage) start = Math.max(1, end - 4);

              for (let i = start; i <= end; i++) {
                const isActive = i === page;
                pages.push(
                  <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[4px] text-[12px] sm:text-[13px] font-bold transition-all ${
                      isActive 
                        ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                        : 'bg-white/[0.03] border border-white/5 text-white/40 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(Math.min(result.pageInfo.lastPage, page + 1))}
              disabled={!result.pageInfo?.hasNextPage}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-[4px] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
            >
              <ChevronRight size={16} />
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => handlePageChange(result.pageInfo.lastPage)}
              disabled={page === result.pageInfo.lastPage}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-[4px] text-white/40 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

