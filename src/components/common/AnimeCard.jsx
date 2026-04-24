import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate } from "react-router-dom";
export default function AnimeCard({ anime }) {
  const [imgError, setImgError] = useState(false);
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  if (!anime) return null;

  // Logic for accurate episode progress: released / total
  const totalEpisodes = anime.episodes || "?";
  let releasedEpisodes = 0;

  if (anime.status === "RELEASING" && anime.nextAiringEpisode) {
    // For airing anime, released is (next episode - 1)
    releasedEpisodes = Math.max(0, anime.nextAiringEpisode.episode - 1);
  } else {
    // For finished or not yet released, use the total episodes field
    releasedEpisodes = anime.episodes || 0;
  }
  const format = anime.format || "TV";

  return (
    <div
      className="w-full cursor-pointer group flex flex-col"
      onClick={() => {
        const resumeParams = anime.isProgress ? `&ep=${anime.episode}&t=${anime.currentTime}` : "";
        navigate(`/watch/${anime.id}${anime.isMAL ? "?mal=true" : "?"}${resumeParams}`);
      }}
    >
      {/* Poster image area with wrapping for jutting tags */}
      <div className="relative">
        {/* Stacked Tags (Aligned to Left Corner) */}
        <div className="absolute -top-1 left-0 flex flex-col items-start z-40 gap-1">
          <div className="bg-red-600 text-white text-[9px] font-black px-1.5 py-[3px] flex items-center justify-center min-w-[28px]">
            {anime.isProgress ? `EP ${anime.episode}` : format}
          </div>
        </div>

        {/* 18+ Badge (Top Right Corner - Professional Red) */}
        {(anime.isAdult || anime.ageRating === "R" || anime.rating?.includes("18")) && (
          <div className="absolute top-1.5 right-1.5 z-40 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-black px-1.5 py-[2px] rounded-[4px] shadow-[0_2px_10px_rgba(220,38,38,0.4)] flex items-center justify-center border border-white/10 tracking-widest">
            18+
          </div>
        )}

        {/* Poster image container */}
        <div className="relative w-full aspect-2/3 overflow-hidden rounded-[6px] bg-[#2a2a2a] shadow-lg text-white">
          {!imgError ? (
            <img
              src={anime.coverImage?.extraLarge || anime.coverImage?.large}
              alt={getTitle(anime.title)}
              loading="lazy"
              onError={() => setImgError(true)}
              onLoad={(e) => e.target.classList.remove("opacity-0")}
              className="w-full h-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#222] text-white/20 p-4 text-center">
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-widest">Image Unavailable</span>
            </div>
          )}

          {/* Progress Bar for Continue Watching */}
          {anime.isProgress && anime.currentTime && anime.duration && (
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20 z-40">
              <div 
                className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" 
                style={{ width: `${Math.min(100, (anime.currentTime / anime.duration) * 100)}%` }}
              />
            </div>
          )}

          {/* Hover overlay (darker gradient + play icon) */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-30">
            <svg
              className="w-12 h-12 text-white drop-shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* CC Info Section (New Cut-Shape Design) - Hide for progress items to keep it clean */}
      {!anime.isProgress && (
        <div className="flex justify-center -mt-[2px] relative z-20">
          <div className="flex items-center bg-[#050505] rounded-[4px] border border-white/5 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <div
              className="bg-red-600 px-1.5 py-0.5 flex items-center justify-center relative"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%, 0 85%)' }}
            >
              <span className="text-[10px] font-medium text-white italic tracking-tight">CC</span>
            </div>

            <div className="flex items-center px-2 py-0.5 gap-1.5">
              <span className="text-[12px] font-normal text-white leading-none">{releasedEpisodes || "0"}</span>
              <div className="w-[1px] h-2.5 bg-white/10" />
              <span className="text-[10px] font-normal text-white/40 leading-none">{totalEpisodes}</span>
            </div>
          </div>
        </div>
      )}

      {/* Title Section */}
      <div className="w-full mt-2 text-center px-1">
        <h3 className="text-[13px] md:text-[14px] font-normal text-white/80 line-clamp-2 leading-[1.4] group-hover:text-red-500 transition-colors">
          {getTitle(anime.title)}
        </h3>
        {anime.isProgress && (
           <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider block mt-1">
             Resume at {Math.floor(anime.currentTime / 60)}:{(anime.currentTime % 60).toString().padStart(2, '0')}
           </span>
        )}
      </div>
    </div>
  );
}
