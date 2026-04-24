import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getSchedule } from "../../services/api";
import { X, ChevronRight, LayoutGrid, Calendar, List } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { ALL_GENRES } from "../../constants/genres";

export default function NavSidebar({ open, onClose, initialTab = "menu" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const panelRef = useRef(null);
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  // Sync activeTab with initialTab when sidebar opens or external initialTab changes
  if (open !== prevOpen || initialTab !== prevInitialTab) {
    setPrevOpen(open);
    setPrevInitialTab(initialTab);
    if (open) {
      setActiveTab(initialTab);
    }
  }

  const [clock, setClock] = useState(new Date());

  // Body Scroll Lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Close on ESC
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Schedule Logic
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const start = Math.floor(d.getTime() / 1000);
    const end = start + 86400;
    days.push({ date: new Date(d), start, end });
  }

  const startTs = days[0].start;
  const endTs = days[days.length - 1].end;

  const { data: scheduleData = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ["schedule", startTs, endTs],
    queryFn: () => getSchedule(startTs, endTs),
    enabled: open && activeTab === "schedule",
    staleTime: 5 * 60 * 1000,
  });

  const grouped = {};
  days.forEach(({ date, start, end }) => {
    const key = date.toDateString();
    grouped[key] = {
      date,
      items: scheduleData
        .filter((s) => s.airingAt >= start && s.airingAt < end && !s.media?.isAdult)
        .sort((a, b) => a.airingAt - b.airingAt),
    };
  });

  const formatTime = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const offset = -(clock.getTimezoneOffset());
  const offsetHrs = Math.floor(Math.abs(offset) / 60);
  const offsetMins = Math.abs(offset) % 60;
  const offsetStr = `GMT ${offset >= 0 ? "+" : "-"}${String(offsetHrs).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;

  const dayName = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = (d) => ({
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
  });

  const types = [
    { label: "Movies", value: "MOVIE" },
    { label: "TV Series", value: "TV" },
    { label: "OVAs", value: "OVA" },
    { label: "ONAs", value: "ONA" },
    { label: "Specials", value: "SPECIAL" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="fixed left-0 top-0 h-full w-[280px] bg-[#080808] border-r border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
      >
        {/* Header with Close */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-0">
            <img src="/logo.png" alt="AniXO" className="h-[98px] object-contain drop-shadow-[0_0_10px_rgba(220,38,38,0.2)] -ml-2" />
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-1.5"><X size={18} /></button>
        </div>

        {/* Triple Tab Controls */}
        <div className="flex border-b border-white/5 mx-4 mt-1">
          {[
            { id: "menu", label: "Menu", icon: List },
            { id: "genre", label: "Genre", icon: LayoutGrid },
            { id: "schedule", label: "Schedule", icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? "text-red-500" : "text-white/40 hover:text-white/70"
                }`}
            >
              <tab.icon size={14} strokeWidth={activeTab === tab.id ? 3 : 2} />
              <span className={`text-[9px] font-medium uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-none mt-1 scrollbar-hide">

          {/* MENU TAB */}
          {activeTab === "menu" && (
            <div className="p-5 pb-20 space-y-8 animate-in fade-in duration-300">
              <section className="space-y-4">
                <h3 className="text-[8px] font-medium uppercase tracking-[0.3em] text-white/20 ml-0.5">Discovery</h3>
                <div className="flex flex-col gap-3">
                  {types.map((type) => (
                    <Link
                      key={type.value}
                      to={`/browse?format=${type.value}`}
                      onClick={onClose}
                      className="text-[16px] font-medium text-white/70 hover:text-red-500 transition-all flex items-center justify-between group px-1"
                    >
                      <span>{type.label}</span>
                      <ChevronRight size={14} className="text-white/10 group-hover:text-red-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              </section>

              <section className="pt-5 border-t border-white/5 space-y-4">
                <h3 className="text-[8px] font-medium uppercase tracking-[0.3em] text-white/20 ml-0.5">Quick Navigation</h3>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Home", path: "/home" },
                    { label: "Recent Releases", path: "/browse?sort=START_DATE_DESC" },
                    { label: "Popular", path: "/browse?sort=POPULARITY_DESC" },
                    { label: "Top Rated", path: "/browse?sort=SCORE_DESC" },
                  ].map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className="text-[13px] font-medium text-white/40 hover:text-white transition-colors px-1"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* GENRE TAB */}
          {activeTab === "genre" && (
            <div className="p-5 pb-20 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                {ALL_GENRES.map((genre) => (
                  <Link
                    key={genre}
                    to={`/browse?genre=${genre}`}
                    onClick={onClose}
                    className="flex items-center gap-2 text-[#777] hover:text-white transition-all group py-0.5"
                  >
                    <div className="w-[3px] h-[3px] bg-red-600 rounded-full shrink-0 group-hover:shadow-[0_0_6px_rgba(220,38,38,0.8)] transition-all" />
                    <span className="text-[12px] font-medium leading-tight truncate">{genre}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === "schedule" && (
            <div className="p-5 pb-20 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-white/50 font-mono tracking-tighter tabular-nums">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-[8px] font-medium bg-red-600/10 text-red-500 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">{offsetStr}</span>
              </div>

              {isScheduleLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-8 bg-white/5 rounded-[3px] animate-pulse" />
                  ))}
                </div>
              ) : (
                Object.entries(grouped).map(([key, { date, items }]) => {
                  if (items.length === 0) return null;
                  const { day, month } = monthDay(date);
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-[3px] border ${isToday ? 'bg-red-600 border-red-600' : 'bg-[#111] border-white/5'} flex flex-col items-center min-w-[34px]`}>
                          <span className={`text-[12px] font-medium leading-none ${isToday ? 'text-white' : 'text-white/60'}`}>{day}</span>
                          <span className={`text-[7px] font-medium uppercase tracking-tighter ${isToday ? 'text-white/80' : 'text-white/20'}`}>{month.slice(0, 3)}</span>
                        </div>
                        <div className="flex-1">
                          <span className={`text-[12px] font-medium ${isToday ? 'text-white' : 'text-white/40'}`}>{dayName(date)}</span>
                          {isToday && <div className="text-[8px] font-medium text-red-500/60 uppercase tracking-widest">Today</div>}
                        </div>
                      </div>

                      <div className="space-y-0.5 pl-0.5">
                        {items.slice(0, 8).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 py-2 px-2.5 rounded-[3px] hover:bg-white/5 transition-all group cursor-pointer border border-transparent"
                            onClick={() => {
                              onClose();
                              navigate(`/watch/${item.media?.id}`);
                            }}
                          >
                            <span className="text-[10px] text-white/20 font-mono">{formatTime(item.airingAt)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium text-white/60 group-hover:text-white truncate transition-colors">{getTitle(item.media?.title)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
