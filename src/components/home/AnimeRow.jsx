import AnimeCard from "../common/AnimeCard";
import SkeletonCard from "../common/SkeletonCard";
import { ChevronDown } from "lucide-react";

export default function AnimeRow({ title, data, isLoading, limit = 6, tabs = [], activeTab = "", onTabChange, showDubBadge = true }) {
  const hasData = data && data.length > 0;

  return (
    <section className="mt-8 max-w-[1720px] mx-auto px-2 md:px-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-5 gap-y-4">
        <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            {/* Vertical Accent Bar */}
            <div className="w-[3.5px] h-6 bg-red-600 rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase leading-none tracking-tighter shrink-0">
              {title}
            </h2>
          </div>

          {/* Categories / Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-3 md:gap-5 overflow-x-auto scrollbar-hide py-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={`text-[12px] md:text-[14px] font-bold transition-all whitespace-nowrap px-2 py-1 rounded relative ${
                    activeTab === tab
                      ? "text-white bg-white/10"
                      : "text-[#999] hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-red-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-7 min-h-[100px]">
        {isLoading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={i >= 20 ? 'hidden sm:block' : 'block'}>
              <SkeletonCard />
            </div>
          ))
        ) : hasData ? (
          data.slice(0, limit).map((anime, i) => (
            <div key={`${anime.id}-${i}`} className={i >= 20 ? 'hidden sm:block' : 'block'}>
              <AnimeCard anime={anime} showDubBadge={showDubBadge} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-white/10">
            <p className="text-sm font-medium uppercase tracking-widest">No results found in this category</p>
          </div>
        )}
      </div>
    </section>
  );
}
