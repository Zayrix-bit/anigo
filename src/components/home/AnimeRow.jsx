import AnimeCard from "../common/AnimeCard";
import SkeletonCard from "../common/SkeletonCard";
import { ChevronDown } from "lucide-react";

export default function AnimeRow({ title, data, isLoading, limit = 6 }) {
  const loading = isLoading || !data || data.length === 0;
  
  return (
    <section className="mt-8 max-w-[1400px] mx-auto px-4 md:px-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Vertical Accent Bar */}
          <div className="w-[3.5px] h-6 bg-red-600 rounded-full" />
          <h2 className="text-xl md:text-2xl font-bold text-white uppercase leading-none tracking-tighter">
            {title}
          </h2>
          {/* Red dropdown arrow icon */}
          <span className="bg-red-600/10 text-red-600 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-red-600 hover:text-white cursor-pointer ml-1">
            <ChevronDown size={14} strokeWidth={3} />
          </span>
        </div>
      </div>
 
      {/* Grid container */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 sm:gap-6 md:gap-8 gap-y-10">
        {loading 
          ? Array.from({ length: limit }).map((_, i) => (
              <div key={i} className={i >= 20 ? 'hidden sm:block' : 'block'}>
                <SkeletonCard />
              </div>
            ))
          : data.slice(0, limit).map((anime, i) => (
              <div key={`${anime.id}-${i}`} className={i >= 20 ? 'hidden sm:block' : 'block'}>
                <AnimeCard anime={anime} />
              </div>
            ))
        }
      </div>
    </section>
  );
}
