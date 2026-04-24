import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { markAsRead, markAllRead, clearNotifications } from "../../services/notificationService";
import { Bell, Check, Trash2, ExternalLink, Calendar, Info, AlertCircle } from "lucide-react";

// Native helper to format time ago without external library
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};

export default function NotificationDropdown({ isOpen, onClose }) {
  const { globalNotifications, setGlobalNotifications } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
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

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#222]">
        <h3 className="text-sm font-bold uppercase tracking-wider">Notifications</h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReadAll}
            className="text-[10px] font-bold text-white/40 hover:text-white transition-colors"
            title="Mark all as read"
          >
            Mark all read
          </button>
          <button 
            onClick={handleClear}
            className="text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-colors"
            title="Clear all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto no-scrollbar">
        {globalNotifications.length > 0 ? (
          <div className="flex flex-col">
            {globalNotifications.map((notif) => (
              <div 
                key={notif._id}
                className={`p-4 border-b border-white/5 flex gap-4 transition-colors relative group ${
                  !notif.isRead ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                )}
                
                {/* Icon based on type */}
                <div className="shrink-0 mt-1">
                  {notif.type === 'NEW_EPISODE' ? (
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-red-500">
                      <Calendar size={14} />
                    </div>
                  ) : notif.type === 'WATCHLIST_UPDATE' ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                      <Info size={14} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500">
                      <AlertCircle size={14} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-xs font-bold leading-tight line-clamp-1 ${!notif.isRead ? 'text-white' : 'text-white/60'}`}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <button 
                        onClick={() => handleMarkRead(notif._id)}
                        className="shrink-0 text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-medium text-white/20 uppercase tracking-wider">
                      {timeAgo(notif.createdAt)}
                    </span>
                    {notif.animeId && (
                      <Link 
                        to={`/watch/${notif.animeId}`}
                        onClick={onClose}
                        className="text-[9px] font-bold text-red-500 flex items-center gap-1 hover:underline"
                      >
                        WATCH <ExternalLink size={8} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center opacity-20">
            <Bell size={40} strokeWidth={1} />
            <p className="text-xs font-bold mt-4 uppercase tracking-[0.2em]">All caught up!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-[#111] text-center border-t border-white/5">
        <button 
          onClick={onClose}
          className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
