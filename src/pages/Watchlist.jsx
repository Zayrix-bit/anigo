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

      <div className="max-w-[1200px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">
        
        {/* Top Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar bg-[#1a1a1a] mb-6 border border-white/5 rounded-sm">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "bookmarks" && location.pathname === "/watchlist");
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
                <Icon size={16} className={isActive ? "text-red-500" : "text-white/40 group-hover:text-white/80"} fill={item.id === "bookmarks" && isActive ? "currentColor" : "none"} />
                <span className={`text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>
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
          <button className="text-sm font-medium text-white/40 hover:text-white flex items-center gap-1 px-4 py-2">
            More <ChevronDown size={14} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-2 mb-8 bg-[#111] border-y md:border md:rounded-sm border-white/5 p-2">
          
          <div className="flex-1 relative bg-[#1a1a1a] rounded-sm flex items-center px-4 py-2 md:py-0 border border-white/5">
            <input 
              type="text" 
              placeholder="Search.." 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/30"
            />
            <Search size={14} className="text-white/30" />
          </div>

          <div className="flex-1 bg-[#1a1a1a] rounded-sm flex items-center justify-between px-4 py-2 border border-white/5">
            <span className="text-sm text-white/30">Type</span>
            <ChevronDown size={14} className="text-white/30" />
          </div>

          <div className="flex-1 bg-[#1a1a1a] rounded-sm flex items-center justify-between px-4 py-2 border border-white/5">
            <span className="text-sm text-white/30">Genre</span>
            <ChevronDown size={14} className="text-white/30" />
          </div>

          <div className="flex-1 bg-[#1a1a1a] rounded-sm flex items-center justify-between px-4 py-2 border border-white/5">
            <span className="text-sm text-white/30">Status</span>
            <ChevronDown size={14} className="text-white/30" />
          </div>

          <div className="flex-1 bg-[#1a1a1a] rounded-sm flex items-center justify-between px-4 py-2 border border-white/5">
            <span className="text-sm text-white/30">Default</span>
            <ChevronDown size={14} className="text-white/30" />
          </div>

          <button className="bg-[#1a1a1a] p-3 rounded-sm border border-white/5 flex items-center justify-center hover:bg-[#222] transition-colors">
            <ArrowDownUp size={14} className="text-white/50" />
          </button>

          <button className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-8 py-2 rounded-sm transition-colors flex items-center justify-center gap-2">
            <Filter size={14} fill="currentColor" />
            Filter
          </button>

        </div>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-lg">
            <svg className="w-16 h-16 text-[#444] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h2 className="text-xl font-bold text-[#888] mb-2">Your watchlist is empty</h2>
            <p className="text-[#666] mb-6 text-sm">Explore anime and click the heart icon to save them here.</p>
            <Link to="/" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition-colors">
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
