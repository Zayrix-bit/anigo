import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, PlayCircle, Filter } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AlphabetNav from "../components/home/AlphabetNav";

export default function Portal() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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
    "Spider-Man", 
    "Demon Slayer"
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-red-600/30">
      {/* Navbar overlay */}
      <Navbar />

      <main className="pt-24 pb-12 px-4 md:px-6 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-center">
        
        {/* Main Portal Container */}
        <div className="flex flex-col lg:flex-row gap-0 overflow-hidden rounded-[8px] bg-[#121212] border border-white/5 shadow-2xl">
          
          {/* Section: Interactive (First on Mobile) */}
          <div className="flex-1 p-6 md:p-14 bg-black/40 backdrop-blur-md flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden group">
            {/* Background Accent Gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-800 to-transparent opacity-50" />
            
            {/* Logo area */}
            <div className="mb-8 md:mb-10 flex items-center justify-center lg:justify-start gap-0">
               <span className="text-[28px] md:text-[40px] font-black italic text-white tracking-tighter">Ani</span>
               <span className="text-[28px] md:text-[40px] font-black italic bg-red-600 text-white px-2 py-0 rounded-[6px] ml-1 shadow-lg shadow-red-900/40">GO</span>
            </div>

            <h1 className="text-2xl md:text-[42px] font-bold text-white mb-6 md:mb-8 leading-[1.1] tracking-tight text-center lg:text-left">
              Watch Free <br className="hidden md:block" />
              <span className="text-red-600">Anime</span> Online
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full max-w-[500px] mb-6 mx-auto lg:mx-0">
              <div className="flex items-center bg-[#1a1a1a] border border-white/10 rounded-[4px] p-1 md:p-1.5 focus-within:border-red-600/50 transition-all shadow-inner">
                <Search className="w-4 h-4 md:w-5 md:h-5 ml-2 md:ml-3 text-white/20" />
                <input 
                  type="text" 
                  placeholder="Search anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none px-2 md:px-3 py-2 md:py-2 text-[14px] md:text-[15px] placeholder:text-white/10"
                />
                <button 
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-[3px] text-[12px] md:text-[13px] font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                  <span className="hidden md:inline">Filter</span>
                  <Filter size={14} className="stroke-[3]" />
                </button>
              </div>
            </form>

            {/* Suggestions - Horizontal Scroll on Mobile */}
            <div className="flex items-center gap-3 mb-8 md:mb-10 w-full overflow-hidden">
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-white/20 shrink-0">Suggestions:</span>
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

            {/* Primary CTA */}
            <Link 
              to="/home"
              className="group flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white w-full lg:w-fit px-10 py-3.5 md:py-4 rounded-[6px] shadow-2xl shadow-red-900/20 transition-all active:scale-95"
            >
              <PlayCircle className="w-5 h-5 md:w-6 md:h-6 fill-white text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-[15px] md:text-[16px] font-black uppercase tracking-wider">Watch now</span>
            </Link>
          </div>

          {/* Section: Content (Below Title on Mobile) */}
          <div className="flex-1 p-8 md:p-14 bg-[#141414] relative overflow-hidden">
            {/* Sidebar Accent */}
            <div className="absolute top-1/2 -right-1 translate-y-[-50%] w-1.5 h-3/4 bg-red-600 rounded-full blur-[1px] opacity-80" />
            
            <div className="relative z-10 space-y-8 h-full flex flex-col">
              <div className="space-y-4">
                <h2 className="text-[20px] font-black uppercase tracking-[0.2em] text-white/80 border-l-4 border-red-600 pl-4 py-1">
                  AniGo: The Best Site For Free Anime Streaming
                </h2>
                <p className="text-[14px] leading-[1.8] text-white/50 font-medium">
                  Anime transcends mere animation; it serves as a portal to captivating worlds brimming with emotion, 
                  creativity, and storytelling. From exhilarating battles to poignant romantic narratives, 
                  anime has solidified its place as a cornerstone of global entertainment, captivating millions 
                  of fans worldwide.
                </p>
                <p className="text-[14px] leading-[1.8] text-white/50 font-medium">
                  However, not all platforms deliver an exceptional experience for fans. Among the myriad options, 
                  <span className="text-red-500"> AniGo.to </span> shines as a beacon of excellence, designed to be a 
                  global hub for anime enthusiasts.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[18px] font-bold text-white/90">
                   1. What is AniGo.to?
                </h3>
                <p className="text-[13px] leading-[1.8] text-white/40">
                  AniGo is a premium anime platform that offers a safe, fast, and high-quality streaming experience. 
                  Unlike other sites, we prioritize user interface, minimal ads, and vast database synchronization 
                  with AniList to give you the most accurate tracking and discovery tools.
                </p>
              </div>

              <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="text-center">
                     <span className="block text-[18px] font-black text-white">80k+</span>
                     <span className="text-[10px] uppercase tracking-widest text-white/30">Episodes</span>
                   </div>
                   <div className="w-px h-8 bg-white/5" />
                   <div className="text-center">
                     <span className="block text-[18px] font-black text-white">Ad-Free</span>
                     <span className="text-[10px] uppercase tracking-widest text-white/30">Streaming</span>
                   </div>
                </div>
                <div className="flex items-center gap-4 text-white/30">
                  <span className="text-[11px] font-bold hover:text-white cursor-pointer transition-colors uppercase tracking-widest">About</span>
                  <span className="text-[11px] font-bold hover:text-white cursor-pointer transition-colors uppercase tracking-widest">Connect</span>
                </div>
              </div>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-600/5 rounded-full blur-[80px]" />
          </div>
        </div>

        {/* Alphabet navigation below */}
        <div className="mt-12 backdrop-blur-sm bg-white/[0.01] rounded-2xl border border-white/5 overflow-hidden py-4">
           <AlphabetNav />
        </div>
      </main>

      <Footer />
    </div>
  );
}
