import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { User, Clock, Heart, Settings as SettingsIcon, LogOut } from "lucide-react";

export default function AvatarDropdown() {
  const { user, logoutAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-red-600 text-white font-bold tracking-wider text-sm overflow-hidden hover:ring-2 hover:ring-white/20 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] ml-1 cursor-pointer"
      >
        {user.username ? user.username.charAt(0).toUpperCase() : "U"}
      </button>

      {isOpen && (
        <div 
          className="absolute top-[48px] right-0 bg-[#141414]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[240px] z-[200] animate-in fade-in slide-in-from-top-2 duration-200 border-t-[3px] border-red-600"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)' }}
        >
          {/* Subtle inner top glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10 pointer-events-none" />

          <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
            <div className="text-white text-[15px] truncate tracking-wide">{user.username}</div>
            <div className="text-[#888] text-[11px] truncate mt-0.5 font-medium">{user.email}</div>
          </div>
          
          <div className="flex flex-col p-2 space-y-0.5">
            <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[#aaa] hover:text-white hover:bg-white/[0.05] px-3 py-2.5 rounded-[3px] text-[13px] transition-all group">
              <User size={15} className="text-[#666] group-hover:text-red-500 transition-colors" strokeWidth={2.5} /> Profile
            </Link>
            <Link to="/watching" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[#aaa] hover:text-white hover:bg-white/[0.05] px-3 py-2.5 rounded-[3px] text-[13px] transition-all group">
              <Clock size={15} className="text-[#666] group-hover:text-red-500 transition-colors" strokeWidth={2.5} /> Continue Watching
            </Link>
            <Link to="/watchlist" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[#aaa] hover:text-white hover:bg-white/[0.05] px-3 py-2.5 rounded-[3px] text-[13px] transition-all group">
              <Heart size={15} className="text-[#666] group-hover:text-red-500 transition-colors" strokeWidth={2.5} /> Bookmarks
            </Link>
            <Link to="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[#aaa] hover:text-white hover:bg-white/[0.05] px-3 py-2.5 rounded-[3px] text-[13px] transition-all group">
              <SettingsIcon size={15} className="text-[#666] group-hover:text-red-500 transition-colors" strokeWidth={2.5} /> Settings
            </Link>
          </div>

          <div className="p-2 border-t border-white/5 bg-black/20">
            <button
              onClick={() => {
                logoutAuth();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full text-left text-red-500 hover:bg-red-500/10 px-3 py-2.5 rounded-[3px] text-[13px] uppercase tracking-widest transition-colors cursor-pointer"
            >
              <LogOut size={15} strokeWidth={2.5} /> Logout
            </button>
          </div>

          {/* Decorative Corner Accent */}
          <div className="absolute bottom-0 right-0 w-[16px] h-[16px] bg-red-600/20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
        </div>
      )}
    </div>
  );
}
