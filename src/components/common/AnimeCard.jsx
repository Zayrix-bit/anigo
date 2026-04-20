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
      onClick={() => navigate(`/watch/${anime.id}${anime.isMAL ? "?mal=true" : ""}`)}
    >
      {/* Poster image area with wrapping for jutting tags */}
      <div className="relative">
        {/* Stacked Tags (Aligned to Left Corner) */}
        <div className="absolute -top-1 left-0 flex flex-col items-start z-40">
          <div className="bg-red-600 text-white text-[9px] font-black px-1.5 py-[3px] flex items-center justify-center min-w-[28px]">
            {format}
          </div>
          <div className="bg-[#1a1a1a] text-white/90 text-[10px] font-medium px-1.5 py-[3px] flex items-center justify-center border-t border-white/5 uppercase whitespace-nowrap">
            {anime.rating || anime.ageRating || anime.ageRatingGuide || (anime.isAdult ? "18+" : "PG-13")}
          </div>
        </div>

        {/* Poster image container */}
        <div className="relative w-full aspect-2/3 overflow-hidden rounded-[6px] bg-[#2a2a2a] shadow-lg text-white">
          {!imgError ? (
            <img
              src={anime.coverImage?.large}
              alt={getTitle(anime.title)}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#222] text-white/20 p-4 text-center">
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-widest">Image Unavailable</span>
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

      {/* CC Info Section (Professional Glass Pill Design) */}
      <div className="flex justify-center -mt-[1px] relative z-20">
        <div className="bg-[#050505]/90 backdrop-blur-md px-2.5 py-1 rounded-[4px] border border-white/5 flex items-center gap-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5 opacity-90 transition-opacity hover:opacity-100">
             <span className="text-red-500">
               <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M19 4H5C3.89 4 3 4.9 3 6V18C3 19.1 3.89 20 5 20H19C20.1 20 21 19.1 21 18V6C21 4.9 20.1 4 19 4M11 11H8.5V10.5H7V13.5H8.5V13H11V14.5C11 15.33 10.33 16 9.5 16H6C5.17 16 4.5 15.33 4.5 14.5V9.5C4.5 8.67 5.17 8 6 8H9.5C10.33 8 11 8.67 11 9.5V11M19.5 11H17V10.5H15.5V13.5H17V13H19.5V14.5C19.5 15.33 18.83 16 18 16H14.5C13.67 16 13 15.33 13 14.5V9.5C13 8.67 13.67 8 14.5 8H18C18.83 8 19.5 8.67 19.5 9.5V11Z" />
               </svg>
             </span>
             <span className="text-[12px] font-bold text-white tracking-tight">{releasedEpisodes || "0"}</span>
          </div>
          <div className="w-[1px] h-2.5 bg-white/10" />
          <span className="text-[11px] font-medium text-white/30 tracking-wide">{totalEpisodes}</span>
        </div>
      </div>

      {/* Title Section */}
      <div className="w-full mt-2">
        <h3 className="text-[13px] md:text-[14px] font-normal text-white/80 line-clamp-2 leading-[1.4] group-hover:text-red-500 transition-colors">
          {getTitle(anime.title)}
        </h3>
      </div>
    </div>
  );
}
