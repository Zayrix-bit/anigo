import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ALL_GENRES } from "../../constants/genres";
import NavSidebar from "./NavSidebar";
import { useLanguage } from "../../context/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { searchAnime, getAnikaiGenres } from "../../services/api";
import { MessageSquare, Mic, Clock } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../auth/LoginModal";
import AvatarDropdown from "../user/AvatarDropdown";
import NotificationDropdown from "../user/NotificationDropdown";


export default function Navbar() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("menu");
  const navigate = useNavigate();
  const location = useLocation();
  const isBrowsePage = location.pathname === "/browse";
  const isLandingPage = location.pathname === "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef(null);
  const { language, setEN, setJP, getTitle } = useLanguage();
  const { user, loading: authLoading, globalNotifications } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = globalNotifications.filter(n => !n.isRead).length;

  const { data: dynamicGenresData } = useQuery({
    queryKey: ["anikaiGenres"],
    queryFn: getAnikaiGenres,
    staleTime: 1000 * 60 * 60 * 24,
  });
  const displayGenres = dynamicGenresData?.length > 0 ? dynamicGenresData : ALL_GENRES;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    const handlePopState = () => {
      setIsSearchOpen(false);
    };

    if (isSearchOpen) {
      window.history.pushState({ searchOpen: true }, "");
      window.addEventListener("popstate", handlePopState);
      document.addEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

  // Real-time search logic from Hero.jsx
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const results = await searchAnime(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Navbar Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const closeSearchOverlay = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      if (window.history.state?.searchOpen) {
        window.history.back();
      }
    }
  };

  const links = [
    { name: "TYPES", path: "/browse", dropdown: "types" },
    { name: "GENRES", path: "/browse", dropdown: "genres" },
    { name: "NEW RELEASES", path: "/browse?sort=START_DATE_DESC" },
    { name: "UPDATES", path: "/browse?sort=UPDATED_AT_DESC" },
    { name: "ONGOING", path: "/browse?status=RELEASING" },
    { name: "RECENT", path: "/browse?sort=START_DATE_DESC" },
    { name: "SCHEDULE", action: "sidebar" },

  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-110 bg-[#121212]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1720px] mx-auto px-2 md:px-4 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSidebarTab("menu");
                setShowSidebar(true);
              }}
              className="lg:hidden text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo */}
            {!isLandingPage && (
              <a
                href="/home"
                className="flex items-center gap-0 shrink-0"
              >
                <img src="/logo.png" alt="AniXO" fetchPriority="high" decoding="async" className="h-[82px] md:h-[114px] w-auto object-contain" style={{ filter: 'brightness(1.2) contrast(1.1)' }} />
              </a>
            )}
          </div>

          {/* Navigation links */}
          {!isLandingPage && (
            <div className="hidden lg:flex items-center gap-6 h-full">
              {links.map((link) => (
                <div
                  key={link.name}
                  className="h-full flex items-center relative group"
                  onMouseEnter={() => link.dropdown && setActiveDropdown(link.dropdown)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={link.path || "#"}
                    onClick={(e) => {
                      if (link.action === "sidebar") {
                        e.preventDefault();
                        setSidebarTab("schedule");
                        setShowSidebar(true);
                      }
                    }}
                    className={`text-[11px] font-bold tracking-[1px] transition-all duration-200 px-3 py-1 rounded-[4px] flex items-center uppercase ${activeDropdown === link.dropdown && link.dropdown
                      ? "text-red-500"
                      : showSidebar && link.action === "sidebar"
                        ? "text-red-500"
                        : "text-white/40 hover:text-white"
                      }`}
                  >
                    {link.name}
                  </Link>

                  {/* Types Dropdown */}
                  {link.dropdown === 'types' && activeDropdown === 'types' && (
                    <div
                      className="absolute top-[56px] left-0 bg-[#121212] border border-white/5 shadow-2xl p-4 w-[180px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="flex flex-col gap-1">
                        {[
                          { label: "Movies", value: "MOVIE" },
                          { label: "TV Series", value: "TV" },
                          { label: "OVAs", value: "OVA" },
                          { label: "ONAs", value: "ONA" },
                          { label: "Specials", value: "SPECIAL" },
                        ].map((type) => (
                          <Link
                            key={type.value}
                            to={`/browse?format=${type.value}`}
                            onClick={() => setActiveDropdown(null)}
                            className="text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2.5 rounded text-[13px] font-medium transition-all leading-tight flex items-center"
                          >
                            {type.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Genres Mega-Dropdown */}
                  {link.dropdown === 'genres' && activeDropdown === 'genres' && (
                    <div
                      className="absolute top-[56px] left-0 -translate-x-[50px] bg-[#121212] border border-white/5 shadow-2xl p-5 w-[650px] z-110 rounded-b-[12px] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="grid grid-cols-5 gap-x-4 gap-y-7">
                        {displayGenres.map((genre) => (
                          <Link
                            key={genre}
                            to={`/browse?genre=${genre}`}
                            onClick={() => setActiveDropdown(null)}
                            className="text-[#888] hover:text-white hover:bg-white/[0.03] px-2 py-1 rounded text-[12px] font-medium transition-all leading-tight flex items-center gap-2 group"
                          >
                            <div className="w-[3px] h-[3px] bg-red-600 rounded-full" />
                            {genre}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-bold uppercase tracking-widest text-[9px]">
                        <span className="text-[#666]">Explore 41 unique categories</span>
                        <Link to="/browse" className="text-red-500 hover:text-red-400">View All Filters</Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Right controls */}
          {!isLandingPage && (
            <div className="flex items-center gap-4">
              {/* EN / JP toggle */}
              <div className="flex items-center overflow-hidden rounded-[4px] bg-[#2a2a2a] border border-white/5 h-[24px]">
                <button
                  onClick={setEN}
                  className={`${language === "EN" ? "bg-red-600 text-white" : "bg-transparent text-[#666] hover:text-[#aaa]"} text-[10px] font-bold px-[8px] h-full flex items-center leading-none italic tracking-tighter transition-colors`}
                >
                  EN
                </button>
                <button
                  onClick={setJP}
                  className={`${language === "JP" ? "bg-red-600 text-white" : "bg-transparent text-[#666] hover:text-[#aaa]"} text-[10px] font-bold px-[8px] h-full flex items-center leading-none italic tracking-tighter transition-colors`}
                >
                  JP
                </button>
              </div>

              {/* Search Trigger */}
              <div ref={searchContainerRef} className="flex items-center">
                {!isBrowsePage && (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="text-[#888] hover:text-white transition-all transform hover:scale-110"
                    title="Search Anime (Shortcut: /)"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}

                {/* Centered Search Overlay */}
                {isSearchOpen && (
                  <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[20vh] px-4 pointer-events-none">
                    {/* Backdrop - Stronger blur for the entire screen */}
                    <div
                      className="fixed inset-0 bg-black/40 animate-in fade-in duration-300 pointer-events-auto cursor-pointer"
                      onClick={closeSearchOverlay}
                    />

                    {/* Search Box - Matching the screenshot */}
                    <div
                      className="relative w-full max-w-[700px] bg-[#1c1c1c] rounded-[4px] shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center p-2 animate-in zoom-in-95 duration-200 pointer-events-auto"
                    >
                      <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center">
                        <div className="pl-4 text-white/40">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search anime"
                          className="bg-transparent text-[16px] md:text-[18px] text-white w-full outline-none px-4 placeholder-white/20 h-[48px]"
                          autoFocus
                        />
                      </form>

                      <button
                        onClick={closeSearchOverlay}
                        className="flex items-center gap-2 text-white/40 hover:text-white px-5 py-2.5 rounded-[3px] text-[13px] font-bold transition-colors shrink-0 group"
                      >
                        <span className="hidden md:inline uppercase tracking-widest text-[11px]">Close</span>
                        <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Dropdown Results - Copy from Hero.jsx */}
                      {showSearchResults && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-[8px] shadow-[0_16px_32px_rgba(0,0,0,0.6)] overflow-hidden z-[210]">
                          {isSearching ? (
                            <div className="p-6 text-center text-white/40 text-[13px] animate-pulse">Searching...</div>
                          ) : searchResults.length > 0 ? (
                            <ul className="max-h-[60vh] overflow-y-auto scrollbar-hide py-2">
                              {searchResults.map((anime) => {
                                const currentEps = anime.nextAiringEpisode ? (anime.nextAiringEpisode.episode - 1) : anime.episodes;
                                return (
                                  <Link
                                    key={anime.id}
                                    to={`/watch/${anime.id}`}
                                    onClick={() => {
                                      closeSearchOverlay();
                                      setSearchQuery("");
                                      setShowSearchResults(false);
                                    }}
                                    className="flex items-start gap-4 p-3 hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/5 last:border-0 group"
                                  >
                                    <img
                                      src={anime.coverImage?.medium || anime.coverImage?.large}
                                      alt={getTitle(anime.title)}
                                      loading="lazy"
                                      onLoad={(e) => e.target.classList.remove("opacity-0")}
                                      className="w-[45px] h-[60px] object-cover opacity-0 transition-opacity duration-300 rounded-[3px] flex-shrink-0 bg-white/5"
                                    />
                                    <div className="flex flex-col min-w-0 justify-center">
                                      <span className="text-white text-[14px] font-bold truncate mb-1.5 group-hover:text-red-500 transition-colors">
                                        {getTitle(anime.title)}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-[2px] rounded flex items-center gap-1 font-medium">
                                          <MessageSquare size={10} className="fill-white/40 text-transparent" />
                                          {currentEps || "?"}
                                        </span>
                                        <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-[2px] rounded flex items-center gap-1 font-medium">
                                          <Mic size={10} fill="currentColor" />
                                          {currentEps || "?"}
                                        </span>
                                        <span className="text-[10px] text-white/40 font-bold">
                                          {anime.format || "TV"}
                                        </span>
                                        {anime.seasonYear && (
                                          <span className="text-[10px] text-white/40 flex items-center gap-1 font-bold">
                                            <Clock size={10} strokeWidth={3} />
                                            {anime.seasonYear}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="p-6 text-center text-white/40 text-[13px]">No results found.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bell icon - Functional with Dropdown */}
              <div className="relative">
                <button 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`block transition-all transform hover:scale-110 ${isNotifOpen ? 'text-red-500' : 'text-[#888] hover:text-white'}`}
                >
                  <svg className={`w-[19px] h-[19px] ${unreadCount > 0 ? 'fill-red-500/20' : 'fill-[#888]/10'}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#121212] animate-in zoom-in duration-300">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
              </div>

              {/* Login Link / Avatar Dropdown */}
              {!authLoading && (
                user ? (
                  <AvatarDropdown />
                ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="text-[12px] font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-[4px] transition-all uppercase tracking-widest ml-1 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer"
                  >
                    Login
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </nav>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Navigation Sidebar (includes Schedule) */}
      <NavSidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        initialTab={sidebarTab}
      />
    </>
  );
}
