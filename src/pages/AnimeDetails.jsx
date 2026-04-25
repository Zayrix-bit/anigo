import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAnimeDetails } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { addToWatchlist, removeFromWatchlist, getWatchlist } from "../services/watchlistService";
import { useEffect } from "react";

export default function AnimeDetails() {
  const { id } = useParams();
  const { getTitle } = useLanguage();
  const [addingAction, setAddingAction] = useState(false);
  const [selectStatus, setSelectStatus] = useState("Watching");
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getWatchlist().then(res => {
        if (res.success) {
          setWatchlist(res.watchlist);
        }
      });
    }
  }, [user]);

  const isBookmarked = watchlist.some(item => item.animeId === String(id));

  const handleToggleWatchlist = async () => {
    if (!user) return alert("Please login to add to watchlist");
    
    setIsWatchlistLoading(true);
    if (isBookmarked) {
      const res = await removeFromWatchlist(id);
      if (res.success) {
        setWatchlist(res.watchlist);
      }
    } else {
      const coverImg = anime.coverImage?.large || anime.coverImage?.extraLarge;
      const res = await addToWatchlist(String(id), getTitle(anime.title), coverImg, 'Planning');
      if (res.success) {
        setWatchlist(res.watchlist);
      }
    }
    setIsWatchlistLoading(false);
  };

  const handleUpdateStatus = async (status) => {
    if (!user) return alert("Please login to manage your list");
    
    setIsWatchlistLoading(true);
    const coverImg = anime.coverImage?.large || anime.coverImage?.extraLarge;
    const res = await addToWatchlist(String(id), getTitle(anime.title), coverImg, status);
    
    if (res.success) {
      setWatchlist(res.watchlist);
      setSelectStatus(status);
      setAddingAction(false);
    }
    setIsWatchlistLoading(false);
  };

  const { data: anime, isLoading } = useQuery({
    queryKey: ["animeDetails", id],
    queryFn: () => getAnimeDetails(Number(id)),
    enabled: !!id,
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex flex-col pt-[52px]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">Anime Not Found</div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col font-sans pb-20">
      <Navbar />

      {/* Hero Banner Area */}
      <div className="relative w-full h-[300px] md:h-[450px] bg-[#1a1a1a]">
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt="Banner"
            className="w-full h-full object-cover opacity-60"
          />
        ) : anime.coverImage?.extraLarge || anime.coverImage?.large ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${anime.coverImage?.extraLarge || anime.coverImage?.large})`,
              filter: 'blur(30px) brightness(0.3)',
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#111]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111]/60 to-[#111]" />
      </div>

      {/* Content Area */}
      <div className="max-w-[1720px] mx-auto px-2 md:px-4 -mt-[100px] md:-mt-[150px] relative z-10 w-full">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          
          {/* Left Column: Poster & Actions */}
          <div className="w-[180px] md:w-[240px] shrink-0 mx-auto md:mx-0">
            <div className="rounded-[4px] overflow-hidden shadow-2xl border border-white/5 bg-[#222]">
              <img
                src={anime.coverImage?.extraLarge || anime.coverImage?.large}
                alt={getTitle(anime.title)}
                className="w-full object-cover aspect-2/3"
              />
            </div>

            {/* List Actions */}
            <div className="mt-6 flex flex-col gap-3">
              {isBookmarked && !addingAction ? (
                <div className="w-full flex items-center justify-between bg-white/[0.05] border border-white/10 rounded-[4px] px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#aaa] uppercase tracking-wider font-bold">In List</span>
                    <span className="text-[13px] font-bold text-white leading-tight">
                      {watchlist.find(i => i.animeId === String(id))?.status || 'Added'}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddingAction(true)}
                    className="text-[#888] hover:text-white transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] rounded-[4px] border border-white/5 p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                  <select
                    value={watchlist.find(i => i.animeId === String(id))?.status || selectStatus}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white text-[13px] font-medium outline-none rounded p-2 border border-transparent focus:border-red-600 transition-colors"
                  >
                    {['Watching', 'On-Hold', 'Planning', 'Completed', 'Dropped'].map(s => (
                      <option key={s} value={s} className="bg-[#222] text-white py-1">{s}</option>
                    ))}
                  </select>
                  {isBookmarked ? (
                     <button
                        onClick={() => setAddingAction(false)}
                        className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-[13px] py-2 rounded transition-colors"
                      >
                        Close
                      </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(selectStatus)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] py-2 rounded transition-colors"
                    >
                      Add to List
                    </button>
                  )}
                </div>
              )}
              
              {/* Watchlist / Bookmark Button */}
              <button
                onClick={handleToggleWatchlist}
                disabled={isWatchlistLoading}
                className={`w-full font-bold text-[13px] py-2.5 rounded transition-colors flex items-center justify-center gap-2 mt-2 ${
                  isBookmarked 
                    ? "bg-white/[0.05] text-white hover:bg-red-600 border border-white/10" 
                    : "bg-transparent text-[#888] border border-[#888] hover:text-white hover:border-white"
                }`}
              >
                {isWatchlistLoading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                {isBookmarked ? "Remove from Watchlist" : "Add to Watchlist"}
              </button>
            </div>
          </div>

          {/* Right Column: Information */}
          <div className="flex-1 text-center md:text-left mt-4 md:mt-24">
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-2">
              {getTitle(anime.title)}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
              <span className="bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-[3px] uppercase tracking-tight">
                {anime.format || "TV"}
              </span>
              <span className="text-[12px] font-bold text-[#888] bg-white/[0.05] px-2 py-0.5 rounded-[3px]">
                {anime.seasonYear || "TBA"}
              </span>
              <span className="text-[12px] font-bold text-[#888] bg-white/[0.05] border border-white/5 px-2 py-0.5 rounded-[3px]">
                {anime.episodes ? `${anime.episodes} Episodes` : "Airing"}
              </span>
              <span className="text-[12px] font-bold text-[#888] flex items-center gap-1">
                ⭐ {anime.averageScore ? `${anime.averageScore}%` : "N/A"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-8">
              {(anime.genres || []).map((genre) => (
                <span
                  key={genre}
                  className="text-[11px] font-bold text-[#ccc] px-2.5 py-1 rounded-full border border-white/10 bg-[#1a1a1a]"
                >
                  {genre}
                </span>
              ))}
            </div>

            <div className="text-[14px] text-[#ccc] leading-[1.8] max-w-[800px]">
              {anime.description ? (
                <div dangerouslySetInnerHTML={{ __html: anime.description }} />
              ) : (
                <p className="italic text-[#666]">No synopsis available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
