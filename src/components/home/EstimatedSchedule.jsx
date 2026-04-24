import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Bell, List as ListIcon, LayoutGrid, Filter, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimeCard from "../common/AnimeCard";

// Helper for random border colors based on ID
const borderColors = [
  "bg-purple-500",
  "bg-orange-500",
  "bg-green-500",
  "bg-pink-500",
  "bg-blue-500",
  "bg-yellow-500"
];

export default function EstimatedSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const { getTitle } = useLanguage();
  const navigate = useNavigate();

  // Generate 7 days (Today + 6)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  // Current start/end range for fetching (broad range to cover all 7 days)
  const startTs = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const endTs = startTs + (7 * 86400);

  const { data: scheduleData = [], isLoading } = useQuery({
    queryKey: ["schedule-section", startTs, endTs],
    queryFn: () => getSchedule(startTs, endTs),
    staleTime: 5 * 60 * 1000,
  });

  // Filter items for the selected date
  const selectedDayItems = scheduleData
    .filter((s) => {
      const itemDate = new Date(s.airingAt * 1000).toDateString();
      return itemDate === selectedDate.toDateString() && !s.media?.isAdult;
    })
    .sort((a, b) => a.airingAt - b.airingAt);

  const formatTime = (ts) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const getDayName = (d) => d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const getDayNum = (d) => d.getDate();
  const getMonthName = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const isToday = (d) => d.toDateString() === new Date().toDateString();
  const isSelected = (d) => d.toDateString() === selectedDate.toDateString();

  // Timezone string
  const offset = -(new Date().getTimezoneOffset());
  const offsetHrs = Math.floor(Math.abs(offset) / 60);
  const offsetMins = Math.abs(offset) % 60;
  const offsetStr = `GMT${offset >= 0 ? "+" : "-"}${String(offsetHrs).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <section className="max-w-[1720px] mx-auto px-2 md:px-4 mt-6 mb-6">
      <div className="bg-[#111111] rounded-[6px] border border-white/5 overflow-hidden">
        
        {/* Header Area */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-[3px] h-4 bg-red-600" />
              <h2 className="text-[16px] font-black text-white uppercase tracking-wider">
                Schedule
              </h2>
              <button className="flex items-center gap-1 text-[11px] font-medium text-[#888] ml-2 hover:text-white transition-colors">
                {tzName} ({offsetStr}) <ChevronDown size={12} />
              </button>
            </div>
            
            {/* List / Grid Toggle */}
            <div className="hidden md:flex items-center bg-[#1a1a1a] rounded-[4px] p-0.5">
              <button 
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-bold transition-all ${viewMode === 'list' ? 'bg-[#ff4d2e] text-white shadow-[0_0_10px_rgba(255,77,46,0.2)]' : 'text-[#888] hover:text-white'}`}
              >
                <ListIcon size={14} /> LIST
              </button>
              <button 
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-bold transition-all ${viewMode === 'grid' ? 'bg-[#ff4d2e] text-white shadow-[0_0_10px_rgba(255,77,46,0.2)]' : 'text-[#888] hover:text-white'}`}
              >
                <LayoutGrid size={14} /> GRID
              </button>
            </div>
          </div>

          {/* Date Selector Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
              <button className="w-8 h-12 rounded-[4px] bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-[#777] hover:text-white transition-all shrink-0">
                <ChevronLeft size={16} />
              </button>
              
              {days.map((date, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center justify-center min-w-[70px] h-[56px] rounded-[4px] transition-all duration-200 shrink-0 ${
                    isSelected(date)
                      ? "bg-[#ff4d2e] shadow-[0_0_15px_rgba(255,77,46,0.3)] border border-[#ff4d2e]"
                      : "bg-[#1a1a1a] border border-white/5 hover:bg-[#222]"
                  }`}
                >
                  <span className={`text-[9px] font-bold tracking-widest uppercase mb-[2px] ${isSelected(date) ? "text-white" : "text-[#777]"}`}>
                    {isToday(date) ? "TODAY" : getDayName(date)}
                  </span>
                  <span className={`text-[18px] leading-none font-black ${isSelected(date) ? "text-white" : "text-white"}`}>
                    {getDayNum(date)}
                  </span>
                  <span className={`text-[9px] font-bold tracking-widest uppercase mt-[2px] ${isSelected(date) ? "text-white/80" : "text-[#777]"}`}>
                    {getMonthName(date)}
                  </span>
                </button>
              ))}

              <button className="w-8 h-12 rounded-[4px] bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-[#777] hover:text-white transition-all shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>

            <button 
              onClick={() => {
                alert("Filter functionality coming soon!");
              }}
              className="hidden md:flex items-center gap-1.5 px-4 h-[40px] ml-4 bg-[#1a1a1a] border border-white/5 rounded-[4px] text-[#888] hover:text-white transition-colors text-[12px] font-bold shrink-0"
            >
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>

        {/* Schedule Grid Area */}
        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse py-3">
                  <div className="w-10 h-3 bg-white/5 rounded" />
                  <div className="w-12 h-16 bg-white/5 rounded" />
                  <div className="flex-1 h-4 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : selectedDayItems.length > 0 ? (
            viewMode === "list" ? (
              <div className="flex flex-col">
                {selectedDayItems.map((item, index) => {
                  const isPast = item.airingAt * 1000 < Date.now();
                  const colorClass = borderColors[item.id % borderColors.length];
                  const isEven = index % 2 === 0;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => navigate(`/watch/${item.media?.id}`)}
                      className={`relative flex items-center justify-between py-2.5 px-4 cursor-pointer group border-b border-white/5 ${isEven ? 'bg-[#141519]' : 'bg-transparent'} hover:bg-white/[0.02] transition-colors`}
                    >
                      {/* Left Colored Border */}
                      {!isPast && (
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${colorClass}`} />
                      )}

                      {/* Left Section */}
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-[12px] font-medium w-10 shrink-0 ${isPast ? "text-[#666]" : "text-[#aaa]"}`}>
                          {formatTime(item.airingAt)}
                        </span>
                        
                        <div className="shrink-0 flex items-center justify-center w-5">
                          {isPast ? (
                            <CheckCircle2 size={16} className="text-[#22c55e]" />
                          ) : (
                            <Clock size={16} className="text-[#3b82f6]" />
                          )}
                        </div>

                        <img 
                          src={item.media?.coverImage?.medium || item.media?.coverImage?.large} 
                          alt={getTitle(item.media?.title)}
                          className="w-[35px] h-[48px] object-cover rounded-[2px] shrink-0 bg-[#222]"
                          loading="lazy"
                        />

                        <div className="flex flex-col min-w-0 py-0.5">
                          <h3 className={`text-[14px] font-bold truncate transition-colors ${isPast ? "text-[#999] group-hover:text-white" : "text-white group-hover:text-[#ff4d2e]"}`}>
                            {getTitle(item.media?.title)}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] font-bold text-[#888] bg-[#222] px-1.5 py-0.5 rounded-[2px]">
                              {item.media?.format || "TV"}
                            </span>
                            <span className="text-[9px] font-bold text-[#3b82f6]">SUB</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Section */}
                      <div className="flex items-center gap-5 shrink-0 pl-4">
                        <span className="text-[11px] font-bold uppercase bg-[#222] text-[#888] px-2.5 py-1 rounded-[2px]">
                          EP {item.episode}
                        </span>
                        <div className="w-5 flex items-center justify-center">
                          {isPast ? (
                            <CheckCircle2 size={16} className="text-[#8b5cf6]" />
                          ) : (
                            <Bell size={16} className="text-[#666] hover:text-white transition-colors" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-4">
                {selectedDayItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <AnimeCard anime={item.media} />
                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-[4px] text-white text-[10px] font-mono border border-white/10 z-50 pointer-events-none shadow-xl flex items-center gap-1.5">
                      <Clock size={10} className="text-red-500" />
                      {formatTime(item.airingAt)}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-[#555] gap-3">
              <Clock size={32} strokeWidth={1} />
              <p className="font-bold uppercase tracking-widest text-[10px]">No Schedule Available</p>
            </div>
          )}
        </div>
        
        {/* Footer Note */}
        <div className="py-3 text-center border-t border-white/5">
          <p className="text-[10px] font-medium text-[#555]">
            All times are in {tzName} ({offsetStr})
          </p>
        </div>

      </div>
    </section>
  );
}
