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

  // Only show "number" for ongoing/airing, show "current / total" for finished
  const progress = (anime.status === "RELEASING" || anime.status === "UPCOMING")
    ? (releasedEpisodes || "0")
    : `${releasedEpisodes || 0} / ${totalEpisodes}`;
  const format = anime.format || "TV";
  const isAdult = anime.isAdult;

  return (
    <div 
      className="w-full cursor-pointer group flex flex-col"
      onClick={() => navigate(`/watch/${anime.id}${anime.isMAL ? "?mal=true" : ""}`)}
    >
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

        {/* Red Format Tag (Top Left) */}
        <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-[3px] rounded-br-[4px] z-20 tracking-tighter shadow-md">
          {format}
        </div>

        {/* Age Rating Badge (Top Left, below Format) */}
        <div className="absolute top-[21px] left-0 bg-[#121212]/90 text-white/70 text-[9px] font-bold px-1.5 py-[2px] rounded-br-[4px] z-10 tracking-widest border-t border-white/5 shadow-lg">
          {isAdult ? "R" : "PG"}
        </div>

        {/* Bottom Overlay Infobar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-[5px] z-10 flex-wrap">
          <span className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-[3px] rounded-[4px] shadow-md tracking-wide flex items-center gap-1.5">
            <span className="text-[7px] font-black border border-white/20 px-0.5 rounded-[1px] opacity-60 leading-tight">CC</span>
            {progress}
          </span>
        </div>

        {/* Hover overlay (darker gradient + play icon) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <svg
            className="w-12 h-12 text-white drop-shadow-xl scale-75 group-hover:scale-100 transition-transform duration-300"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Title Section */}
      <div className="w-full mt-2.5">
        <h3 className="text-[13px] md:text-[14px] font-normal text-white/80 line-clamp-2 leading-[1.4] group-hover:text-red-500 transition-colors">
          {getTitle(anime.title)}
        </h3>
      </div>
    </div>
  );
}
