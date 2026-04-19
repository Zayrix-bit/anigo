import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, PlayCircle, Filter } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AlphabetNav from "../components/home/AlphabetNav";

export default function Portal() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Professional UX: Page Title and Scroll Reset
  useEffect(() => {
    document.title = "AniGO | Watch Free Anime Online";
    window.scrollTo(0, 0);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const suggestions = [
    "One Piece", 
    "Solo Leveling", 
    "Bleach", 
    "Naruto", 
    "Jujutsu Kaisen", 
    "Attack on Titan", 
    "Demon Slayer"
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-red-600/30">
      <Navbar />

      <main className="pt-20 pb-10 px-4 md:px-6 max-w-[1300px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-start lg:justify-center">
        
        {/* Main Portal Container - Professional Chamfered Design */}
        <div 
          className="relative p-[1px] bg-white/10 shadow-2xl transition-transform duration-500 ease-out"
          style={{ 
            clipPath: 'polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)' 
          }}
        >
          <div 
            className="flex flex-col lg:flex-row gap-0 overflow-hidden bg-[#121212]"
            style={{ 
              clipPath: 'polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)' 
            }}
          >
            {/* Section: Interactive (First on Mobile) */}
            <div className="flex-1 p-6 md:p-10 md:pl-16 bg-black/40 backdrop-blur-md flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden group">
              {/* Subtle top cut indicator */}
              <div className="absolute top-0 left-[40px] right-0 h-[2px] bg-gradient-to-r from-red-600/30 to-transparent" />
              
              {/* Logo area */}
              <div className="mb-6 md:mb-8 flex items-center justify-center lg:justify-start gap-0">
                 <span className="text-[28px] md:text-[32px] font-black italic text-white tracking-tighter">Ani</span>
                 <span className="text-[28px] md:text-[32px] font-black italic bg-red-600 text-white px-2.5 py-0 rounded-[5px] ml-1 shadow-lg shadow-red-900/30">GO</span>
              </div>

              <h1 className="text-2xl md:text-[36px] font-bold text-white mb-5 md:mb-6 leading-[1.1] tracking-tight text-center lg:text-left">
                Watch Free <br className="hidden md:block" />
                <span className="text-red-600">Anime</span> Online
              </h1>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative w-full max-w-[480px] mb-5 mx-auto lg:mx-0">
                <div className="flex items-center bg-[#1a1a1a] border border-white/10 rounded-[4px] p-1 md:p-1 focus-within:border-red-600/5 transition-all shadow-inner">
                  <Search className="w-4 h-4 md:w-5 md:h-5 ml-2 md:ml-3 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none px-2 md:px-3 py-2 text-[14px] md:text-[15px] placeholder:text-white/10"
                  />
                  <button 
                    type="button"
                    onClick={() => navigate("/browse")}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-5 py-1.5 md:py-1.5 rounded-[3px] text-[12px] md:text-[13px] font-bold flex items-center gap-2 transition-all active:scale-95"
                  >
                    <span className="hidden md:inline">Filter</span>
                    <Filter size={14} className="stroke-[3]" />
                  </button>
                </div>
              </form>

              {/* Suggestions */}
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8 w-full overflow-hidden">
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {suggestions.map(s => (
                    <Link 
                      key={s} 
                      to={`/browse?search=${s}`}
                      className="text-[10px] md:text-[11px] font-medium text-white/40 hover:text-red-500 whitespace-nowrap bg-white/5 border border-white/5 px-2.5 py-1 rounded-[4px] transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Primary CTA - Professional Redesign */}
              <Link 
                to="/home"
                className="group relative flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white w-full lg:w-fit px-12 py-4 shadow-xl transition-all duration-300 active:scale-95"
                style={{ 
                  clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' 
                }}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-5 h-5 flex items-center justify-center bg-white rounded-full">
                    <svg className="w-3 h-3 text-red-600 fill-current translate-x-[1px]" viewBox="0 0 24 24">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                  </div>
                  <span className="text-[14px] font-bold uppercase tracking-[0.15em]">Watch now</span>
                </div>
                
                {/* Subtle Hover Overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>

            {/* Section: Content */}
            <div className="flex-1 p-8 md:p-10 md:pr-16 bg-[#141414] relative overflow-hidden">
              {/* Subtle bottom cut indicator */}
              <div className="absolute bottom-0 left-0 right-[40px] h-[2px] bg-gradient-to-l from-red-600/30 to-transparent" />
              
              <div className="relative z-10 space-y-6 h-full flex flex-col">
                <div className="space-y-3">
                  <h2 className="text-[18px] font-black uppercase tracking-[0.2em] text-white/80 border-l-4 border-red-600 pl-4 py-1">
                    AniGo: Best Free Anime Streaming
                  </h2>
                  <p className="text-[13px] leading-[1.6] text-white/50 font-medium">
                    Anime transcends mere animation; it serves as a portal to captivating worlds brimming with emotion, 
                    creativity, and storytelling. From exhilarating battles to poignant romantic narratives, 
                    anime has solidified its place as a global cornerstone.
                  </p>
                  <p className="text-[13px] leading-[1.6] text-white/50 font-medium">
                    However, not all platforms deliver an exceptional experience. Among the myriad options, 
                    <span className="text-red-500"> AniGo.to </span> shines as a beacon of excellence for enthusiasts.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[16px] font-bold text-white/90">
                     1. What is AniGo.to?
                  </h3>
                  <p className="text-[12px] leading-[1.6] text-white/40">
                    AniGo is a premium anime platform that offers a safe, fast, and high-quality streaming experience. 
                    We prioritize user interface, minimal ads, and vast database synchronization 
                    for the most accurate tracking.
                  </p>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="text-center">
                       <span className="block text-[16px] font-black text-white">80k+</span>
                       <span className="text-[9px] uppercase tracking-widest text-white/30">Episodes</span>
                     </div>
                     <div className="w-px h-6 bg-white/5" />
                     <div className="text-center">
                       <span className="block text-[16px] font-black text-white">Ad-Free</span>
                       <span className="text-[9px] uppercase tracking-widest text-white/30">Streaming</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 text-white/30">
                    <span className="text-[11px] font-bold hover:text-white cursor-pointer transition-colors uppercase tracking-widest">About</span>
                    <span className="text-[11px] font-bold hover:text-white cursor-pointer transition-colors uppercase tracking-widest">Connect</span>
                  </div>
                </div>
              </div>

              {/* Subtle background decoration */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-600/[0.03] rounded-full blur-[80px]" />
            </div>
          </div>
        </div>

        {/* Alphabet navigation */}
        <div className="mt-12 backdrop-blur-sm bg-white/[0.01] rounded-2xl border border-white/5 overflow-hidden py-4">
           <AlphabetNav />
        </div>
      </main>

      <Footer />
    </div>
  );
}
