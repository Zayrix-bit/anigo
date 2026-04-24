import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { User, Clock, Heart, Bell, Download, Settings, Key } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    displayName: user?.displayName || user?.username || ""
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSave = (e) => {
    e.preventDefault();
    // Here we would call the backend to update user profile
    // e.g. updateProfile(formData)
    alert("Profile update logic will be implemented in the backend!");
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" }
  ];

  if (!user) return null;

  return (
    <div key={user?.id || 'profile'} className="min-h-screen bg-[#111] text-white flex flex-col font-sans">
      <Navbar />

      <div className="max-w-[1000px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">
        
        {/* Top Navigation Tabs */}
        <div className="flex bg-[#1a1a1a] mb-6 md:mb-8 border border-white/5 rounded-sm shadow-xl overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === "profile" && location.pathname === "/profile");
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

        {/* Profile Content */}
        <div className="flex justify-center mt-6 md:mt-12">
          <div className="bg-[#1a1a1a] p-6 sm:p-8 md:p-12 rounded-md border border-white/5 w-full max-w-[700px] shadow-2xl flex flex-col md:flex-row-reverse items-center md:items-start md:justify-between gap-8 md:gap-12">
            
            {/* Avatar Section - Top on mobile, Right on desktop */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-24 h-24 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-white/10 shadow-lg">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-red-600 flex items-center justify-center text-3xl md:text-3xl font-black">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs text-white/40 font-bold uppercase tracking-wider md:hidden">Your Avatar</span>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSave} className="flex flex-col gap-5 md:gap-6 w-full max-w-[450px]">
              
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  value={formData.username}
                  readOnly // usually username is fixed
                  className="bg-[#111] text-white/70 px-4 py-3 rounded-sm border border-white/5 outline-none font-medium text-[13px] md:text-sm w-full cursor-not-allowed"
                />
                <span className="text-[10px] md:text-[11px] text-white/40 ml-1">Username.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-[#111] text-white focus:bg-[#151515] focus:border-red-600/50 px-4 py-3 rounded-sm border border-white/5 outline-none font-medium text-[13px] md:text-sm w-full transition-colors"
                />
                <span className="text-[10px] md:text-[11px] text-white/40 ml-1">Email address.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="bg-[#111] text-white focus:bg-[#151515] focus:border-red-600/50 px-4 py-3 rounded-sm border border-white/5 outline-none font-medium text-[13px] md:text-sm w-full transition-colors"
                />
                <span className="text-[10px] md:text-[11px] text-white/40 ml-1">Display name.</span>
              </div>

              <button type="button" className="flex items-center justify-center md:justify-start gap-2 text-white/70 hover:text-white transition-colors mt-2">
                <Key size={14} />
                <span className="text-xs font-bold tracking-wide">Change Password</span>
              </button>

              <button
                type="submit"
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide text-sm py-3.5 rounded-sm transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
