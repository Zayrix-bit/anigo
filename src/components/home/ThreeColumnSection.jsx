import { useState } from "react";
import { Tv, Heart, Star, ArrowUpRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate } from "react-router-dom";

/* ── Skeleton Loaders ── */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-[7px] border-b border-[#2a2a2a] last:border-0">
      <div className="w-[42px] h-[56px] rounded-[2px] bg-[#2a2a2a] animate-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#2a2a2a] rounded animate-shimmer w-full" />
        <div className="h-2 bg-[#2a2a2a] rounded animate-shimmer w-1/2" />
      </div>
    </div>
  );
}

function SkeletonRankedItem() {
  return (
    <div className="flex items-start gap-3 py-[6px] border-b border-[#2a2a2a] last:border-0">
      <div className="w-6 h-6 rounded-[3px] bg-[#2a2a2a] animate-shimmer shrink-0 mt-1" />
      <div className="w-[42px] h-[56px] rounded-[2px] bg-[#2a2a2a] animate-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#2a2a2a] rounded animate-shimmer w-full" />
        <div className="h-2 bg-[#2a2a2a] rounded animate-shimmer w-1/3" />
      </div>
    </div>
  );
}

/* ── Small list item (used in New Releases & Just Completed) ── */
function ListItem({ anime }) {
  const { getTitle } = useLanguage();
  const navigate = useNavigate();
  return (
    <div 
      className="flex items-center gap-3 py-[7px] cursor-pointer group border-b border-[#2a2a2a] last:border-0"
      onClick={() => navigate(`/watch/${anime.id}`)}
    >
      <img
        src={anime.coverImage?.medium || anime.coverImage?.large}
        alt={getTitle(anime.title)}
        loading="lazy"
        onLoad={(e) => e.target.classList.remove("opacity-0")}
        className="w-[42px] h-[56px] object-cover opacity-0 transition-opacity duration-500 rounded-[2px] shrink-0 bg-[#2a2a2a]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-[#ccc] truncate group-hover:text-white transition-colors leading-snug">
          {getTitle(anime.title)}
        </p>
        <div className="flex items-center gap-[6px] mt-[3px]">
          <span className="text-[9px] font-semibold text-[#999] bg-[#2a2a2a] px-[5px] py-px rounded-[2px]">
            {anime.format || "TV"}
          </span>
          {anime.averageScore && (
            <span className="text-[9px] font-semibold text-[#999] bg-[#2a2a2a] px-[5px] py-px rounded-[2px] flex items-center gap-[2px]">
              <Star size={9} fill="currentColor" /> {anime.averageScore}%
            </span>
          )}
          <span className="text-[9px] text-[#666] flex items-center gap-[2px]">
            <Tv size={10} /> {anime.episodes || "?"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Ranked item (used in Most Viewed) ── */
function RankedItem({ anime, rank, featured }) {
  const { getTitle } = useLanguage();
  const navigate = useNavigate();
  
  if (featured) {
    return (
      <div className="cursor-pointer group mb-1" onClick={() => navigate(`/watch/${anime.id}`)}>
        <div className="relative rounded-[2px] overflow-hidden border border-white/5">
          <img
            src={anime.coverImage?.large}
            alt={getTitle(anime.title)}
            loading="lazy"
            onLoad={(e) => e.target.classList.remove("opacity-0")}
            className="w-full aspect-16/10 object-cover opacity-0 transition-all duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
          {/* Large rank number */}
          <span
            className="absolute -bottom-2 -left-1 text-[72px] font-bold text-red-600 leading-none opacity-40 italic select-none pointer-events-none"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.1)" }}
          >
            {rank}
          </span>
        </div>
        <div className="pt-3 px-1">
          <p className="text-[13px] font-bold text-white/90 leading-tight uppercase group-hover:text-red-500 transition-colors">
            {getTitle(anime.title)}
          </p>
          <div className="flex items-center gap-[10px] mt-2 text-[10px] font-bold uppercase tracking-wider text-white/20">
            <span className="flex items-center gap-1.5"><Tv size={11} className="text-red-600/50" /> {anime.episodes || "?"}</span>
            <span className="flex items-center gap-1.5"><Heart size={11} fill="currentColor" className="text-red-600/50" /> {anime.favourites || "?"}</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded-[1px]">{anime.format}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-4 cursor-pointer group py-3 border-b border-white/5 last:border-0"
      onClick={() => navigate(`/watch/${anime.id}`)}
    >
      {/* Rank badge */}
      <span
        className="text-[20px] font-bold italic text-white/20 group-hover:text-red-600 transition-colors w-7 text-right select-none"
      >
        {rank}
      </span>
      <img
        src={anime.coverImage?.medium || anime.coverImage?.large}
        alt={getTitle(anime.title)}
        loading="lazy"
        onLoad={(e) => e.target.classList.remove("opacity-0")}
        className="w-[48px] h-[64px] object-cover opacity-0 transition-opacity duration-500 rounded-[2px] shrink-0 bg-white/5 shadow-lg border border-white/5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-white/70 truncate group-hover:text-white transition-colors leading-tight uppercase">
          {getTitle(anime.title)}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/20">
          <span className="flex items-center gap-1"><Tv size={10} /> {anime.episodes || "?"}</span>
          <span className="flex items-center gap-1"><Heart size={10} fill="currentColor" /> {anime.favourites || "?"}</span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded-[1px]">{anime.format}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Section title with arrow ── */
function SectionHeader({ title, hasArrow = false, path }) {
  const navigate = useNavigate();
  const lines = title.split("\n");
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-5 bg-red-600 rounded-full" />
        <h2 className="text-lg font-extrabold text-white uppercase leading-tight tracking-tight">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </h2>
      </div>
      {hasArrow && (
        <span 
          onClick={() => path && navigate(path)}
          className="w-6 h-6 bg-red-600 rounded-[3px] flex items-center justify-center text-white cursor-pointer hover:bg-red-700 transition-colors"
        >
          <ArrowUpRight size={14} />
        </span>
      )}
    </div>
  );
}

/* ── Main three-column section ── */
export default function ThreeColumnSection({ newReleases, mostViewed, justCompleted, isLoading }) {
  const [activeTab, setActiveTab] = useState("Day");

  return (
    <section className="mt-12 max-w-[1720px] mx-auto px-2 md:px-4 w-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start w-full">
        
        {/* ── LEFT: New Releases ── */}
        <div className="w-full">
          <SectionHeader 
            title={"NEW\nRELEASES"} 
            hasArrow 
            path="/browse?sort=START_DATE_DESC" 
          />
          <div className="w-full">
            {isLoading 
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : newReleases.slice(0, 6).map((anime, i) => (
                  <ListItem key={`nr-${anime.id}-${i}`} anime={anime} />
                ))
            }
          </div>
        </div>

        {/* ── CENTER: Most Viewed ── */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-5 w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-5 bg-red-600 rounded-full" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                MOST VIEWED
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {["Day", "Week", "Month"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[11px] md:text-[12px] font-medium transition-colors pb-[2px] ${
                    activeTab === tab
                      ? "text-white border-b border-white"
                      : "text-[#666] hover:text-[#aaa]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 w-full">
            {isLoading ? (
              <>
                <SkeletonRankedItem featured />
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRankedItem key={i} />)}
              </>
            ) : (
              <>
                {mostViewed
                  .slice(
                    activeTab === "Day" ? 0 : activeTab === "Week" ? 6 : 12,
                    activeTab === "Day" ? 6 : activeTab === "Week" ? 12 : 18
                  )
                  .slice(0, 6)
                  .map((anime, i) => (
                    <RankedItem key={`mv-${activeTab}-${anime.id}-${i}`} anime={anime} rank={i + 1} />
                  ))}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Just Completed ── */}
        <div className="w-full">
          <SectionHeader 
            title={"JUST\nCOMPLETED"} 
            hasArrow 
            path="/browse?status=FINISHED" 
          />
          <div className="w-full">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonListItem key={i} />)
              : justCompleted.slice(0, 6).map((anime, i) => (
                  <ListItem key={`jc-${anime.id}-${i}`} anime={anime} />
                ))
            }
          </div>
        </div>

      </div>
    </section>
  );
}
