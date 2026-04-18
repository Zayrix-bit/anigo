import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStaffDetails } from "../services/api";
import { 
  ChevronLeft, 
  Heart, 
  Calendar, 
  MapPin, 
  User, 
  MessageSquare,
  Activity,
  Award
} from "lucide-react";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";


export default function Staff() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffDetails(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Loading Profile</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-4xl font-black text-white/10 uppercase tracking-tighter">Voice Actor Not Found</h1>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          GO BACK
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-red-600/30">
      <Navbar />

      {/* Premium Glassy Header */}
      <div className="relative h-[40vh] min-h-[400px] overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img 
            src={staff.image?.large} 
            className="w-full h-full object-cover blur-3xl scale-125 opacity-20"
            alt="background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        </div>

        <div className="relative h-full max-w-[1400px] mx-auto px-6 flex items-end pb-12">
          <div className="flex flex-col md:flex-row gap-8 md:items-center w-full">
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-[4px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img 
                src={staff.image?.large} 
                className="relative w-48 h-64 md:w-56 md:h-72 object-cover rounded-[3px] border border-white/10 shadow-2xl"
                alt={staff.name?.full}
              />
            </div>

            <div className="flex-1 space-y-4">
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-all">
                  <ChevronLeft size={16} />
                </div>
                <span className="text-[12px] font-bold tracking-[0.2em] uppercase">Return</span>
              </button>

              <div className="space-y-1">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                  {staff.name?.full}
                </h1>
                <p className="text-xl md:text-2xl font-bold text-white/30 uppercase tracking-tighter">
                  {staff.name?.native}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {staff.primaryOccupations?.map((occ, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-[4px] text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {occ}
                  </span>
                ))}
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-[4px] text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  <Heart size={12} fill="currentColor" />
                  {staff.favourites?.toLocaleString()} Favorites
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-20">
          {/* Main Content Column */}
          <div className="space-y-20">
            {/* Biography */}
            <section>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-[3px] h-8 bg-red-600 rounded-full" />
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Biography</h2>
              </div>
              <div 
                className="prose prose-invert prose-p:text-white/60 prose-p:leading-relaxed prose-p:text-[16px] max-w-none font-medium text-justify selection:bg-red-600/30"
                dangerouslySetInnerHTML={{ __html: staff.description || "No biography available for this voice actor." }}
              />
            </section>

            {/* Characters Voiced Section */}
            <section>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-[3px] h-8 bg-red-600 rounded-full" />
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Characters Voiced</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staff.characterMedia?.edges?.map((edge, i) => {
                  if (edge.node.type !== "ANIME") return null;
                  const character = edge.characters?.[0];
                  if (!character) return null;

                  return (
                    <div 
                      key={i}
                      className="group flex bg-[#0d0d0d] border border-white/5 rounded-[4px] overflow-hidden hover:border-red-600/30 transition-all duration-300"
                    >
                      {/* Character Side */}
                      <Link to={`/character/${character.id}`} className="flex-1 flex items-center p-3 gap-4 hover:bg-white/[0.02]">
                        <img 
                          src={character.image?.large} 
                          className="w-16 h-20 object-cover rounded-[2px]"
                          alt={character.name?.full}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-white truncate group-hover:text-red-500 transition-colors uppercase leading-tight">
                            {character.name?.userPreferred}
                          </p>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                            {edge.characterRole}
                          </p>
                        </div>
                      </Link>

                      {/* Anime Side (Small Info) */}
                      <Link to={`/watch/${edge.node.id}`} className="w-[140px] border-l border-white/5 p-3 flex flex-col justify-center gap-1 hover:bg-white/[0.05] transition-colors">
                        <p className="text-[10px] font-black text-white/40 truncate uppercase">
                          {edge.node.title?.romaji || edge.node.title?.english}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-red-500/80 uppercase">
                            {edge.node.format}
                          </span>
                          <span className="text-[9px] font-bold text-white/20 uppercase">
                            {edge.node.averageScore}%
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Details</h2>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: "Gender", value: staff.gender, icon: User },
                  { 
                    label: "Birthday", 
                    value: staff.dateOfBirth?.year ? `${staff.dateOfBirth.day}/${staff.dateOfBirth.month}/${staff.dateOfBirth.year}` : null, 
                    icon: Calendar 
                  },
                  { label: "Home Town", value: staff.homeTown, icon: MapPin },
                  { label: "Language", value: staff.languageV2, icon: MessageSquare },
                  { label: "Age", value: staff.age, icon: Activity },
                ].map((item, i) => item.value && (
                  <div key={i} className="flex flex-col gap-1.5 p-4 bg-white/[0.03] border border-white/5 rounded-[4px]">
                    <div className="flex items-center gap-2 text-white/20">
                      <item.icon size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </div>
                    <p className="text-[14px] font-bold text-white/80">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Premium Stats or Something Extra */}
            <div className="p-8 bg-gradient-to-br from-red-600/20 to-transparent border border-red-600/10 rounded-[4px] relative overflow-hidden group">
              <div className="relative z-10">
                < Award className="text-red-500 mb-4" size={32} />
                <h3 className="text-[14px] font-black text-white uppercase tracking-widest mb-2">Professional Seiyuu</h3>
                <p className="text-[12px] text-white/40 font-medium leading-relaxed">
                  Highly acclaimed voice talent contributing to the anime industry's greatest masterpieces.
                </p>
              </div>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-all duration-1000" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
