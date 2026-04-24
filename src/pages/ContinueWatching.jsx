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

      <div className="max-w-[1200px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">

        {/* Top Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar bg-[#1a1a1a] mb-8 border border-white/5 rounded-sm shadow-xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col gap-2 min-w-[140px] flex-1 p-4 transition-colors relative group ${
                  isActive ? "bg-[#222]" : "hover:bg-[#222]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                )}
                <Icon size={16} className={isActive ? "text-red-500" : "text-white/40 group-hover:text-white/80"} />
                <span className={`text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-7">
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
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
            <Clock size={60} strokeWidth={1} />
            <p className="text-sm font-bold mt-6 uppercase tracking-[0.2em]">Nothing here yet</p>
            <p className="text-xs mt-2 text-white/40 max-w-[300px]">Start watching anime and your progress will appear here for easy resuming.</p>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
