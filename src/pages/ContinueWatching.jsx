import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import { useAuth } from "../hooks/useAuth";
import { removeProgress } from "../services/progressService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Trash2 } from "lucide-react";

export default function ContinueWatching() {
  const { user, globalProgress, setGlobalProgress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const handleRemove = async (animeId) => {
    const res = await removeProgress(animeId);
    if (res.success) {
      setGlobalProgress(prev => prev.filter(p => p.animeId !== animeId));
    }
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  const progressCards = (globalProgress || []).map(p => ({
    id: p.animeId,
    title: { english: p.title },
    coverImage: { large: p.coverImage },
    episode: p.episode,
    currentTime: p.currentTime,
    duration: p.duration,
    isProgress: true
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <div className="w-full pt-[80px] px-4 md:px-8 pb-12 flex-1">

        {/* Top Navigation Tabs */}
        <div className="flex bg-[#1a1a1a] mb-6 md:mb-8 border border-white/5 rounded-sm shadow-xl overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center justify-center md:items-start flex-1 aspect-square md:aspect-auto md:min-w-[140px] md:p-4 transition-colors relative group border-r border-white/5 last:border-r-0 ${
                  isActive ? "bg-[#2a2a2a] md:bg-[#222]" : "bg-transparent hover:bg-[#222]"
                }`}
              >
                {isActive && (
                  <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                )}
                <div className="flex items-center justify-center w-full md:w-auto md:mb-2">
                  <Icon size={20} className={`md:w-4 md:h-4 ${isActive ? "text-red-600" : "text-[#888] group-hover:text-white/80"}`} />
                </div>
                <span className={`hidden md:block text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[3.5px] h-6 bg-red-600 rounded-full" />
          <h1 className="text-xl font-bold uppercase tracking-tight">Continue Watching</h1>
          <span className="text-xs text-white/30 font-bold bg-white/5 px-2 py-0.5 rounded ml-2">
            {progressCards.length}
          </span>
        </div>

        {/* Grid */}
        {progressCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-7">
            {progressCards.map((anime, i) => (
              <div key={`${anime.id}-${i}`} className="relative group/card">
                <AnimeCard anime={anime} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(anime.id);
                  }}
                  className="absolute top-2 right-2 z-50 bg-black/70 backdrop-blur-sm p-1.5 rounded-full text-white/40 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all"
                  title="Remove from Continue Watching"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-[#141414] border border-white/5 rounded-md shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/5 rounded-full blur-[80px]"></div>
            
            {/* Icon Container */}
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Clock size={32} className="text-white/40" strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Nothing Here Yet</h2>
            <p className="text-white/40 mb-8 text-[15px] max-w-sm text-center leading-relaxed">
              Start watching an anime and your progress will appear here, making it easy to pick up right where you left off.
            </p>
            
            <Link 
              to="/browse" 
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-8 rounded text-sm uppercase tracking-widest transition-colors"
            >
              Start Watching
            </Link>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
