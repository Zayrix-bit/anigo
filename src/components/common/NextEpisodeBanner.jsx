import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

export default function NextEpisodeBanner({ anime }) {
  const [timeLeft, setTimeLeft] = useState(null);

  const nextEpisode = anime?.nextAiringEpisode;
  const airingAt = nextEpisode?.airingAt;

  useEffect(() => {
    if (!airingAt) return;

    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = airingAt - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [airingAt]);

  if (!nextEpisode || anime.status !== "RELEASING") return null;

  const releaseDate = airingAt ? new Date(airingAt * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) : "Release date unavailable";

  return (
    <div className="w-full bg-[#0d0d0d] border border-white/5 rounded-[4px] overflow-hidden mb-6 sm:mb-8 group transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 gap-3 sm:gap-4">
        {/* Left Section: Info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-red-600/10 items-center justify-center shrink-0">
            <Calendar size={14} className="text-red-600" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] sm:text-[14px] font-semibold text-white leading-none">
                Episode {nextEpisode.episode}
              </span>
              <span className="px-1.5 py-0.5 bg-red-600 text-[8px] sm:text-[9px] font-bold text-white rounded-[2px] leading-none uppercase tracking-tighter">
                Predicted
              </span>
            </div>
            <p className="text-[11px] sm:text-[12px] text-white/40 font-medium uppercase tracking-wider">
              Arriving: <span className="text-white/60 lowercase">{releaseDate}</span>
            </p>
          </div>
        </div>

        {/* Right Section: Countdown */}
        {timeLeft && (
          <div className="flex items-center justify-between sm:justify-end gap-4 py-1.5 px-3 sm:p-0 bg-white/[0.03] sm:bg-transparent rounded-[2px] border border-white/5 sm:border-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-white/20">
              <Clock size={12} className="sm:w-[14px] sm:h-[14px]" />
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider leading-none">LIVE</span>
            </div>
            
            <div className="flex items-center gap-3">
              {[
                { label: 'd', value: timeLeft.days },
                { label: 'h', value: timeLeft.hours },
                { label: 'm', value: timeLeft.minutes },
                { label: 's', value: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-0.5">
                  <span className="text-[14px] sm:text-[15px] font-medium text-white tabular-nums leading-none">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-red-600 uppercase leading-none opacity-80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
