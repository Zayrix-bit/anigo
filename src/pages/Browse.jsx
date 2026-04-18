import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBrowseAnime } from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import SkeletonCard from "../components/common/SkeletonCard";
import { Search, ChevronDown, ArrowDownUp, Filter } from "lucide-react";
import { ALL_GENRES, OFFICIAL_GENRES } from "../constants/genres";

export default function Browse() {
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState(() => {
    const genreParam = searchParams.get("genre");
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort");
    const searchParam = searchParams.get("search");

    return {
      search: searchParam || "",
      formats: typeParam ? [typeParam] : [],
      genres: genreParam ? [genreParam] : [],
      status: statusParam || "",
      sort: sortParam || "TRENDING_DESC",
      year: null,
      season: null,
      country: "",
      rating: null,
      language: [],
      excludeMyList: false,
    };
  });

  // Clean React 18+ pattern to sync state from external source without cascading effect renders
  const [prevSearchString, setPrevSearchString] = useState(searchParams.toString());
  if (searchParams.toString() !== prevSearchString) {
    setPrevSearchString(searchParams.toString());
    
    const genreParam = searchParams.get("genre");
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort");
    const searchParam = searchParams.get("search");

    setFilters(prev => ({
      ...prev,
      search: searchParam !== null ? searchParam : prev.search,
      genres: genreParam ? [genreParam] : [],
      formats: typeParam ? [typeParam] : [],
      status: statusParam || "",
      sort: sortParam || "TRENDING_DESC",
    }));
  }

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

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
    queryKey: ["browse", debouncedSearch, filters.formats, filters.genres, filters.status, filters.sort, filters.year, filters.season, filters.country, filters.rating],
    queryFn: () => {
      const variables = {
        page: 1,
        sort: [filters.sort],
      };
      if (debouncedSearch.trim()) variables.search = debouncedSearch;
      if (filters.formats.length > 0) variables.format_in = filters.formats;
      
      // Smart Mapping: Split genres into genre_in and tag_in
      if (filters.genres.length > 0) {
        const genre_in = [];
        const tag_in = [];
        filters.genres.forEach(g => {
          if (OFFICIAL_GENRES.includes(g)) genre_in.push(g);
          else tag_in.push(g);
        });
        if (genre_in.length > 0) variables.genre_in = genre_in;
        if (tag_in.length > 0) variables.tag_in = tag_in;
      }

      if (filters.status) variables.status = filters.status;
      if (filters.year) variables.seasonYear = parseInt(filters.year);
      if (filters.season) variables.season = filters.season;
      if (filters.country) variables.country = filters.country;
      if (filters.rating) variables.averageScore_greater = parseInt(filters.rating);
      
      console.info("[AniList] Browse Variables:", variables);
      
      return getBrowseAnime(variables);
    },
    enabled: true,
  });

  const animeList = result.media || [];
  const totalCount = result.pageInfo?.total || 0;

  const toggleFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [key]: isSelected 
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  const handleSingleSelect = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const loading = isLoading || isFetching;

  const handleSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(filters.search);
    refetch();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-24 pb-12">
        {/* Header Title & Result Count */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[14px] font-semibold uppercase tracking-widest text-white opacity-50">
            BROWSER
          </h1>
          {!isLoading && (
            <span className="text-[10px] font-bold text-white/40 bg-white/[0.03] px-2 py-1 rounded border border-white/5 uppercase tracking-wider">
              {totalCount.toLocaleString()} Anime
            </span>
          )}
        </div>

        {/* Pixel-Matched Filter Bar */}
        <form 
          onSubmit={handleSubmit}
          className="flex items-stretch mb-10 bg-[#121212] border border-white/5 rounded-[4px] h-10 relative filter-dropdown-container"
        >
          {/* Search Input */}
          <div className="relative flex-[1.5] border-r border-white/5 group">
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
              className="w-full h-full bg-transparent px-3 text-[12px] text-white/50 placeholder-white/20 outline-none hover:bg-white/[0.02] transition-colors"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 w-3 h-3" />
          </div>

          {/* Type Dropdown */}
          <div className="relative flex-1 border-r border-white/5">
            <button
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
              onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
              className="w-full h-full flex items-center justify-between px-3 text-[12px] text-white/40 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">
                {filters.genres.length > 0 ? `Genre (${filters.genres.length})` : 'Genre'}
              </span>
              <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${openDropdown === 'genre' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'genre' && (
              <div className="absolute top-[44px] left-[-100px] md:left-0 w-[380px] md:w-[650px] bg-[#121212] border border-white/5 rounded-[4px] shadow-2xl p-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
                {/* Grid Container (No Scroll) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  {ALL_GENRES.map(g => {
                    const isSelected = filters.genres.includes(g);
                    return (
                      <button 
                        key={g} 
                        onClick={() => toggleFilter('genres', g)}
                        className="flex items-center gap-3 group text-left py-0.5"
                      >
                        <div className={`w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center transition-colors shrink-0 ${
                          isSelected ? 'bg-red-600 border-red-600' : 'bg-transparent border-white/20 group-hover:border-white/40'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white" style={{ clipPath: 'polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)' }} />
                          )}
                        </div>
                        <span className={`text-[12px] truncate transition-colors ${isSelected ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>
                          {g}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Actions Footer */}
                {filters.genres.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                    <button 
                      onClick={() => setFilters(p => ({ ...p, genres: [] }))}
                      className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 transition-colors"
                    >
                      Clear All Genres
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative flex-1 border-r border-white/5">
            <button
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
                    onClick={() => {
                      setFilters(p => ({ ...p, year: null, season: null, country: "", rating: null, language: [], excludeMyList: false }));
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-4 gap-y-8 sm:gap-y-8">
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : animeList.length > 0 ? (
          <div className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-4 gap-y-8 sm:gap-y-8 transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 opacity-40">
            <p className="text-sm font-medium">No results found matching your selection.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

