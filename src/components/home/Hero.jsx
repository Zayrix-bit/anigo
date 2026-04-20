import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchAnime } from "../../services/api";
import { MessageSquare, Mic, Clock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function Hero({ bgImages = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { getTitle } = useLanguage();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      setShowDropdown(true);
      const results = await searchAnime(searchQuery);
      setSearchResults(results);
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const mapContentRating = (rating) => {
    if (!rating || rating === "N/A") return "N/A";
    const labels = {
      'G': 'All Ages',
      'PG': 'PG',
      'PG_13': 'PG-13',
      'R': '18+',
      'R_17': '17+',
    };
    return labels[rating] || rating;
  };

  return (
    <section className="relative w-full pt-[52px] z-50">
      {/* Background anime artwork mosaic */}
      <div className="absolute inset-0 flex overflow-hidden">
        {bgImages.slice(0, 6).map((img, i) => (
          <div key={i} className="flex-1 h-full overflow-hidden">
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover opacity-[0.12] scale-110"
            />
          </div>
        ))}
      </div>
      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1c]/50 via-[#1a1a1a]/70 to-[#1a1a1a]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/80 via-transparent to-[#1a1a1a]/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center py-14 md:py-20 px-4 md:px-6">
        {/* Main heading */}
        <h1 className="text-3xl md:text-[42px] font-bold text-white text-center leading-tight">
          Watch Anime Online for FREE!
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-[13px] text-[#999] text-center max-w-[480px] leading-[1.7]">
          Enjoy your anime anywhere, anytime in HD with the fast streaming servers.
          <br />
          If you enjoy the website, please consider sharing it with your friends. Thank you!
        </p>

        {/* Social share buttons */}
        <div className="mt-5 flex items-center gap-[6px] flex-wrap justify-center">
          {/* Share count */}
          <div className="text-center mr-2">
            <span className="text-[13px] font-bold text-[#ccc]">69.5k</span>
            <span className="block text-[9px] text-[#777]">Shares</span>
          </div>

          {/* Facebook */}
          <button className="flex items-center gap-[5px] bg-[#3b5998] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            <span>26.7k</span>
          </button>

          {/* X / Twitter */}
          <button className="flex items-center gap-[5px] bg-[#2d2d2d] border border-[#444] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <span className="text-[13px] font-bold">𝕏</span>
            <span>9.8k</span>
          </button>

          {/* Messenger */}
          <button className="flex items-center gap-[5px] bg-[#0084ff] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.907 1.432 5.502 3.667 7.19V22l3.456-1.896c.92.256 1.9.396 2.877.396 5.523 0 10-4.144 10-9.257C22 6.145 17.523 2 12 2zm1.05 12.463l-2.547-2.716-4.97 2.716 5.466-5.805 2.61 2.716 4.907-2.716-5.466 5.805z" /></svg>
            <span>4.9k</span>
          </button>

          {/* Reddit */}
          <button className="flex items-center gap-[5px] bg-[#ff4500] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 13.69c.11.25.17.53.17.81 0 2.57-2.99 4.65-6.68 4.65-3.69 0-6.68-2.08-6.68-4.65 0-.28.06-.56.17-.81-.44-.37-.73-.92-.73-1.54 0-1.1.9-2 2-2 .52 0 .99.2 1.35.53 1.13-.67 2.53-1.08 4.03-1.13l.9-2.82 2.3.52c.27-.42.74-.7 1.27-.7.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5c-.71 0-1.3-.49-1.46-1.15l-1.77-.4-.64 2.02c1.55.03 2.99.45 4.15 1.13.36-.33.83-.53 1.35-.53 1.1 0 2 .9 2 2 0 .62-.29 1.17-.73 1.54zM9.5 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm5 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-5.36 4.83c.65.65 1.72 1.17 2.86 1.17s2.21-.52 2.86-1.17.13-.52-.22-.22c-.47.47-1.32.87-2.64.87s-2.17-.4-2.64-.87c-.35-.3-.87.08-.22.22z" /></svg>
            <span>20.2k</span>
          </button>

          {/* WhatsApp */}
          <button className="flex items-center gap-[5px] bg-[#25D366] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.559 4.148 1.54 5.89L0 24l6.305-1.654A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.95 0-3.87-.538-5.514-1.558l-.396-.234-3.742.981.999-3.648-.259-.41A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" /></svg>
            <span>3.8k</span>
          </button>

          {/* Telegram */}
          <button className="flex items-center bg-[#0088cc] text-white text-[11px] font-semibold px-3 py-[6px] rounded-[3px] hover:brightness-110 transition">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
          </button>
        </div>

        {/* Search bar */}
        <div ref={searchRef} className="mt-6 w-full max-w-[520px] relative">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#3a3a3a]"
          >
            <div className="pl-3 pr-1">
              <svg className="w-[18px] h-[18px] text-[#666]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search anime"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
              className="flex-1 py-[10px] px-2 bg-transparent text-[13px] text-white outline-none placeholder-[#666]"
            />
            <button
              onClick={() => navigate("/browse")}
              className="bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium px-4 py-[10px] flex items-center gap-1.5 transition-colors"
            >
              Filter
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </button>
          </form>

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#111] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden z-50">
              {loading ? (
                <div className="p-4 text-center text-[#999] text-[13px]">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul className="max-h-[350px] overflow-y-auto scrollbar-hide py-1">
                  {searchResults.slice(0, 10).map((anime) => {
                    const currentEps = anime.nextAiringEpisode ? (anime.nextAiringEpisode.episode - 1) : anime.episodes;
                    return (
                      <li
                        key={anime.id}
                        onClick={() => {
                          navigate(`/watch/${anime.id}`);
                          setShowDropdown(false);
                        }}
                        className="flex items-start gap-4 p-3 hover:bg-[#222] cursor-pointer transition-colors border-b border-[#2a2a2a] last:border-0"
                      >
                        <img
                          src={anime.coverImage?.medium || anime.coverImage?.large}
                          alt={getTitle(anime.title)}
                          className="w-[50px] h-[70px] object-cover rounded-[3px] flex-shrink-0 bg-[#2a2a2a]"
                        />
                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="text-white text-[15px] font-bold truncate mb-2">
                            {getTitle(anime.title)}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* CC Badge */}
                            <span className="text-[11px] text-[#aaa] bg-[#2a2a2a] px-2 py-[3px] rounded flex items-center gap-1.5 font-medium">
                              <MessageSquare size={12} className="fill-[#aaa] text-transparent" />
                              {currentEps || "?"}
                            </span>
                            {/* Mic Badge */}
                            <span className="text-[11px] text-[#aaa] bg-[#2a2a2a] px-2 py-[3px] rounded flex items-center gap-1.5 font-medium">
                              <Mic size={12} fill="currentColor" />
                              {currentEps || "?"}
                            </span>
                            {/* EP Count (Text only) */}
                            <span className="text-[11px] text-[#777] font-bold mr-1">
                              {currentEps || "?"}
                            </span>
                            {/* Rating Badge */}
                            <span className="text-[11px] text-[#777] border border-[#333] px-1.5 py-[1px] rounded font-medium uppercase tracking-tight">
                              {mapContentRating(anime.contentRating || anime.rating || (anime.isAdult ? "18+" : "PG-13"))}
                            </span>
                            {/* Type */}
                            <span className="text-[11px] text-[#777] font-bold">
                              {anime.format || "TV"}
                            </span>
                            {/* Year with Clock */}
                            {anime.seasonYear && (
                              <span className="text-[11px] text-[#777] flex items-center gap-1 font-bold">
                                <Clock size={12} strokeWidth={3} />
                                {anime.seasonYear}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-4 text-center text-[#999] text-[13px]">No results found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
