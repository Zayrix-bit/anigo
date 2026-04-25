import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

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
        <div className="absolute top-[48px] right-0 bg-[#121212] border border-white/5 shadow-2xl rounded-lg w-[180px] z-110 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-white/5">
            <div className="text-white text-sm font-bold truncate">{user.username}</div>
            <div className="text-white/40 text-xs truncate">{user.email}</div>
          </div>
          
          <div className="flex flex-col p-1">
            <Link to="/profile" onClick={() => setIsOpen(false)} className="text-left text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2 rounded text-xs font-medium transition-colors block">
              Profile
            </Link>
            <Link to="/watching" onClick={() => setIsOpen(false)} className="text-left text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2 rounded text-xs font-medium transition-colors block">
              Continue Watching
            </Link>
            <Link to="/watchlist" onClick={() => setIsOpen(false)} className="text-left text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2 rounded text-xs font-medium transition-colors block">
              Bookmarks
            </Link>
            <Link to="/settings" onClick={() => setIsOpen(false)} className="text-left text-white/60 hover:text-white hover:bg-white/[0.03] px-3 py-2 rounded text-xs font-medium transition-colors block">
              Settings
            </Link>
          </div>

          <div className="p-1 border-t border-white/5">
            <button
              onClick={() => {
                logoutAuth();
                setIsOpen(false);
              }}
              className="w-full text-left text-red-500 hover:bg-red-500/10 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
