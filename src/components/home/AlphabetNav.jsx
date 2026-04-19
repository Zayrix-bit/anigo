import { useNavigate, useSearchParams } from "react-router-dom";

export default function AlphabetNav() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const handleSearch = (value) => {
    // Scroll to top smoothly before navigating
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    if (value === "ALL") {
      navigate("/browse");
    } else {
      // Force TITLE_ROMAJI sort for alphabetical browsing to ensure better API results
      navigate(`/browse?search=${value}&sort=TITLE_ROMAJI`);
    }
  };

  return (
    <section className="mt-14 max-w-[1400px] mx-auto px-4 md:px-6 select-none">
      {/* Label */}
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6">
        Searching anime order by alphabet name <span className="text-white/40">A to Z</span>
      </p>

      {/* Letter buttons */}
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-[4px] md:gap-[6px] lg:gap-[8px]">
        {/* All */}
        <button 
          onClick={() => handleSearch("ALL")}
          className={`text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-[4px] border transition-all duration-300 ${
            currentSearch === "" 
              ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20" 
              : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.08] hover:text-white hover:border-white/10"
          }`}
        >
          All
        </button>

        {/* 0-9 */}
        <button 
          onClick={() => handleSearch("0-9")}
          className={`text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-[4px] border transition-all duration-300 ${
            currentSearch === "0-9" 
              ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20" 
              : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.08] hover:text-white hover:border-white/10"
          }`}
        >
          0-9
        </button>

        {/* A-Z */}
        {letters.map((letter) => {
          const isActive = currentSearch.toUpperCase() === letter;
          return (
            <button
              key={letter}
              onClick={() => handleSearch(letter)}
              className={`text-[11px] font-black w-[34px] h-[34px] rounded-[4px] border transition-all duration-300 flex items-center justify-center ${
                isActive 
                  ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20 scale-110 z-10" 
                  : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.08] hover:text-white hover:border-white/10"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </section>
  );
}
