import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { getWatchlist, removeFromWatchlist } from "../services/watchlistService";
import { User, Clock, Heart, Bell, Download, Settings, Search, Filter, ArrowDownUp, ChevronDown } from "lucide-react";

export default function Watchlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("All");

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  const subTabs = ["All", "Watching", "On-Hold", "Planning", "Completed", "Dropped"];

  useEffect(() => {
    if (!user) {
      navigate("/"); // Redirect to home if not logged in
      return;
    }

    const fetchWatchlist = async () => {
      const res = await getWatchlist();
      if (res.success) {
        setWatchlist(res.watchlist);
      }
      setIsLoading(false);
    };

    fetchWatchlist();
  }, [user, navigate]);

  const handleRemove = async (animeId, e) => {
    e.preventDefault(); // Prevent navigating to anime details
    const res = await removeFromWatchlist(animeId);
    if (res.success) {
      setWatchlist(res.watchlist);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        <Navbar />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col font-sans">
      <Navbar />

      <div className="max-w-[1000px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">
        
        {/* Top Navigation Tabs */}
        <div className="flex bg-[#1a1a1a] mb-6 md:mb-8 border border-white/5 rounded-sm shadow-xl overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "bookmarks" && location.pathname === "/watchlist");
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
                  <Icon size={20} className={`md:w-4 md:h-4 ${isActive ? "text-red-600" : "text-[#888] group-hover:text-white/80"}`} fill={item.id === "bookmarks" && isActive ? "currentColor" : "none"} />
                </div>
                <span className={`hidden md:block text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-6 mb-6 px-2 overflow-x-auto no-scrollbar">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-medium whitespace-nowrap transition-colors px-4 py-2 rounded-sm ${
                activeTab === tab ? "bg-[#222] text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>



        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-[#141414] border border-white/5 rounded-md shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/5 rounded-full blur-[80px]"></div>
            
            {/* Icon Container */}
            <div className="relative w-20 h-20 mb-6 rounded-full bg-red-600/10 flex items-center justify-center border border-red-500/20">
              <Heart size={32} className="text-red-500" strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Your Watchlist is Empty</h2>
            <p className="text-white/40 mb-8 text-[15px] max-w-sm text-center leading-relaxed">
              Looks like you haven't saved any anime yet. Discover new shows and add them to your collection!
            </p>
            
            <Link 
              to="/browse" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded text-sm uppercase tracking-widest transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
            >
              Browse Anime
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {watchlist.map((item) => (
              <Link 
                to={`/anime/${item.animeId}`} 
                key={item.animeId}
                className="group relative flex flex-col gap-2"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#222]">
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#444] text-xs">No Image</div>
                  )}
                  
                  {/* Remove Overlay Button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={(e) => handleRemove(item.animeId, e)}
                      className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transform scale-75 group-hover:scale-100 transition-all duration-200 shadow-xl"
                      title="Remove from Watchlist"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#ccc] group-hover:text-white transition-colors line-clamp-2 leading-tight mt-1">
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
