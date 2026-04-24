import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../hooks/useAuth";
import { updateSettings } from "../services/settingsService";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, Shield, CheckCircle2 } from "lucide-react";

const getDefaults = (settings) => ({
  titleLanguage: settings?.titleLanguage || 'EN',
  videoLanguage: settings?.videoLanguage || 'Any',
  skipSeconds: settings?.skipSeconds || 5,
  bookmarksPerPage: settings?.bookmarksPerPage || 20,
  autoPlay: settings?.autoPlay ?? true,
  autoNext: settings?.autoNext ?? true
});

export default function Settings() {
  const { user, globalSettings, setGlobalSettings } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // Key forces form remount when globalSettings loads/changes — no setState in effect needed
  const settingsKey = globalSettings?.updatedAt || globalSettings?._id || 'default';

  const [formData, setFormData] = useState(() => getDefaults(globalSettings));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSettings(formData);
    if (res.success) {
      setGlobalSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans" key={settingsKey}>
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

        {/* Settings Form - Exact Screenshot Style */}
        <div className="max-w-[800px] mx-auto">
          <form onSubmit={handleSubmit} className="bg-[#141414] rounded-md border border-white/5 overflow-hidden shadow-2xl">
            
            {/* 1. Title Language */}
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-white/90">Title language</h3>
                <p className="text-xs text-white/40">Language to display anime names.</p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="titleLanguage" 
                      checked={formData.titleLanguage === 'EN'} 
                      onChange={() => setFormData({...formData, titleLanguage: 'EN'})}
                      className="peer appearance-none w-4 h-4 rounded-full border border-white/20 checked:border-red-600 transition-all"
                    />
                    <div className="absolute w-2 h-2 rounded-full bg-red-600 scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className={`text-sm font-medium ${formData.titleLanguage === 'EN' ? 'text-white' : 'text-white/40'}`}>English</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="titleLanguage" 
                      checked={formData.titleLanguage === 'JP'} 
                      onChange={() => setFormData({...formData, titleLanguage: 'JP'})}
                      className="peer appearance-none w-4 h-4 rounded-full border border-white/20 checked:border-red-600 transition-all"
                    />
                    <div className="absolute w-2 h-2 rounded-full bg-red-600 scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className={`text-sm font-medium ${formData.titleLanguage === 'JP' ? 'text-white' : 'text-white/40'}`}>Japanese</span>
                </label>
              </div>
            </div>

            {/* 2. Video Language */}
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-white/90">Video language</h3>
                <p className="text-xs text-white/40 max-w-[300px]">The player will automatically select your preferred video language if available.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {['Any', 'Hard Sub', 'Soft Sub', 'Dub'].map((lang) => (
                  <label key={lang} className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="videoLanguage" 
                        checked={formData.videoLanguage === lang} 
                        onChange={() => setFormData({...formData, videoLanguage: lang})}
                        className="peer appearance-none w-4 h-4 rounded-full border border-white/20 checked:border-red-600 transition-all"
                      />
                      <div className="absolute w-2 h-2 rounded-full bg-red-600 scale-0 peer-checked:scale-100 transition-transform" />
                    </div>
                    <span className={`text-sm font-medium ${formData.videoLanguage === lang ? 'text-white' : 'text-white/40'}`}>{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Skip Seconds */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-white/90">Skip seconds</h3>
                <p className="text-xs text-white/40">Number of seconds to skip backward/forward (J/L keys).</p>
              </div>
              <input 
                type="number" 
                value={formData.skipSeconds}
                onChange={(e) => setFormData({...formData, skipSeconds: parseInt(e.target.value) || 0})}
                className="w-20 bg-[#1a1a1a] border border-white/10 rounded-sm px-3 py-2 text-center text-sm font-bold text-white focus:border-red-600/50 outline-none transition-colors"
              />
            </div>

            {/* 4. Bookmarks Per Page */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-white/90">Bookmarks per page</h3>
                <p className="text-xs text-white/40">Amount of items shown in your watchlist.</p>
              </div>
              <input 
                type="number" 
                value={formData.bookmarksPerPage}
                onChange={(e) => setFormData({...formData, bookmarksPerPage: parseInt(e.target.value) || 20})}
                className="w-20 bg-[#1a1a1a] border border-white/10 rounded-sm px-3 py-2 text-center text-sm font-bold text-white focus:border-red-600/50 outline-none transition-colors"
              />
            </div>

            {/* 5. Notification Folders (Placeholders matching screenshot) */}
            <div className="p-8 border-b border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-[15px] font-bold text-white/90">Notification ignore folders</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Watching', 'On-Hold', 'Planning', 'Completed'].map((folder) => (
                  <label key={folder} className="flex items-center gap-2 cursor-not-allowed opacity-30">
                    <div className="w-4 h-4 border border-white/20 rounded-sm" />
                    <span className="text-xs font-medium text-white/40">{folder}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-0">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-bold py-5 text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Settings Saved</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
