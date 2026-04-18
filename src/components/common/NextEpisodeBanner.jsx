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
    <div className="w-full bg-white/[0.03] border border-white/5 rounded-sm overflow-hidden mb-8 group transition-all hover:bg-white/[0.05]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-4">
        {/* Date Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
            <Calendar size={14} className="text-red-600" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none">Next Episode</span>
              <span className="px-1.5 py-0.5 bg-red-600 text-[9px] font-black text-white rounded-[2px] leading-none uppercase">Predicted</span>
            </div>
            <p className="text-[13px] text-white/70 font-medium mt-1">
              Episode {nextEpisode.episode} is arriving on <span className="text-white font-bold">{releaseDate}</span>
            </p>
          </div>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-sm border border-white/5">
            <div className="flex items-center gap-2 text-white/30">
              <Clock size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Countdown</span>
            </div>
            
            <div className="flex items-center gap-3">
              {[
                { label: 'd', value: timeLeft.days },
                { label: 'h', value: timeLeft.hours },
                { label: 'm', value: timeLeft.minutes },
                { label: 's', value: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-0.5">
                  <span className="text-[16px] font-bold text-white tabular-nums leading-none">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-black text-red-600 uppercase leading-none">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
