import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { markAsRead, markAllRead, clearNotifications } from "../services/notificationService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Check, Trash2, Calendar, Info, AlertCircle, ExternalLink } from "lucide-react";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return Math.floor(seconds) + "s ago";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 2592000) return Math.floor(seconds / 86400) + "d ago";
  return Math.floor(seconds / 2592000) + "mo ago";
};

export default function Notifications() {
  const { user, globalNotifications, setGlobalNotifications } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleReadAll = async () => {
    const res = await markAllRead();
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleClear = async () => {
    const res = await clearNotifications();
    if (res.success) {
      setGlobalNotifications([]);
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

  const unreadCount = globalNotifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <div className="max-w-[1000px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">

        {/* Top Navigation Tabs */}
        <div className="flex bg-[#1a1a1a] mb-6 md:mb-8 border border-white/5 rounded-sm shadow-xl overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center justify-center md:items-start flex-1 aspect-square md:aspect-auto md:min-w-[140px] md:p-4 transition-colors relative group border-r border-white/5 last:border-r-0 ${isActive ? "bg-[#2a2a2a] md:bg-[#222]" : "bg-transparent hover:bg-[#222]"}`}
              >
                {isActive && <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}
                <div className="flex items-center justify-center w-full md:w-auto md:mb-2">
                  <Icon size={20} className={`md:w-4 md:h-4 ${isActive ? "text-red-600" : "text-[#888] group-hover:text-white/80"}`} />
                </div>
                <span className={`hidden md:block text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-[3.5px] h-6 bg-red-600 rounded-full" />
            <h1 className="text-xl font-bold uppercase tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-[10px] text-white font-bold bg-red-600 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReadAll} className="text-[11px] font-bold text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">
              Mark all read
            </button>
            <button onClick={handleClear} className="text-[11px] font-bold text-red-500/60 hover:text-red-500 transition-colors px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        {globalNotifications.length > 0 ? (
          <div className="bg-[#141414] border border-white/5 rounded-md overflow-hidden shadow-2xl">
            {globalNotifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-5 border-b border-white/5 flex gap-4 transition-colors relative group ${!notif.isRead ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}
              >
                {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}

                <div className="shrink-0 mt-1">
                  {notif.type === 'NEW_EPISODE' ? (
                    <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center text-red-500"><Calendar size={16} /></div>
                  ) : notif.type === 'WATCHLIST_UPDATE' ? (
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500"><Info size={16} /></div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500"><AlertCircle size={16} /></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-bold leading-tight ${!notif.isRead ? 'text-white' : 'text-white/60'}`}>{notif.title}</h4>
                    {!notif.isRead && (
                      <button onClick={() => handleMarkRead(notif._id)} className="shrink-0 text-white/20 hover:text-red-500 transition-colors" title="Mark as read">
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-medium text-white/20 uppercase tracking-wider">{timeAgo(notif.createdAt)}</span>
                    {notif.animeId && (
                      <Link to={`/watch/${notif.animeId}`} className="text-[10px] font-bold text-red-500 flex items-center gap-1 hover:underline">
                        WATCH <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-[#141414] border border-white/5 rounded-md shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/5 rounded-full blur-[80px]"></div>
            
            {/* Icon Container */}
            <div className="relative w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Bell size={32} className="text-white/40" strokeWidth={1.5} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">All Caught Up!</h2>
            <p className="text-white/40 mb-8 text-[15px] max-w-sm text-center leading-relaxed">
              You don't have any new notifications right now. We'll let you know when new episodes of your saved anime air.
            </p>
            
            <Link 
              to="/browse" 
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-8 rounded text-sm uppercase tracking-widest transition-colors"
            >
              Explore Anime
            </Link>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
