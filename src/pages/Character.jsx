import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCharacterDetails } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ChevronLeft, Heart, Info, Star, Tv, Activity } from "lucide-react";

export default function Character() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTitle } = useLanguage();

  const { data: char, isLoading } = useQuery({
    queryKey: ["character", id],
    queryFn: () => getCharacterDetails(parseInt(id)),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Loading Character...</p>
        </div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-4xl font-black text-white/10 uppercase tracking-tighter">Character Not Found</h1>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={18} /> GO BACK
        </button>
      </div>
    );
  }

  const animeAppearances = char.media?.edges || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-[400px] sm:h-[500px] overflow-hidden">
        {/* Blurred Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-20"
          style={{ backgroundImage: `url(${char.image?.large})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 h-full flex flex-col justify-end pb-12">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-24 left-4 md:left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors group mb-8"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:bg-white/5">
              <ChevronLeft size={18} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest">Return</span>
          </button>

          <div className="flex flex-col md:flex-row items-end gap-8">
            {/* Character Image */}
            <div className="w-[180px] sm:w-[240px] shrink-0 rounded-[4px] overflow-hidden border border-white/10 shadow-2xl relative group">
              <img 
                src={char.image?.large} 
                alt={char.name?.full} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow-lg">
                <Heart size={16} fill="white" />
              </div>
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-2 py-1 bg-white/10 text-white/50 text-[10px] font-black uppercase rounded-[2px] tracking-widest">
                  Character Profile
                </span>
                {char.gender && (
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase rounded-[2px] tracking-widest">
                    {char.gender}
                  </span>
                )}
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter uppercase mb-2">
                {char.name?.full}
              </h1>
              <p className="text-xl font-bold text-red-600/80 mb-6 italic">
                {char.name?.native}
              </p>
              
              <div className="flex flex-wrap gap-6 text-[12px] font-bold uppercase tracking-wider text-white/40">
                {char.age && <div>Age: <span className="text-white">{char.age}</span></div>}
                {char.bloodType && <div>Blood Type: <span className="text-white">{char.bloodType}</span></div>}
                <div>Favourites: <span className="text-white">{char.favourites?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-12">
            {/* Biography */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Biography</h2>
              </div>
              <div 
                className="prose prose-invert max-w-none text-white/60 leading-relaxed text-[15px]"
                dangerouslySetInnerHTML={{ __html: char.description || "No biography available for this character." }}
              />
            </section>

            {/* Anime Appearances */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Appearances</h2>
                </div>
                <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">{animeAppearances.length} TITLES</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-6">
                {animeAppearances.map((edge) => (
                  <Link 
                    key={edge.node.id}
                    to={`/watch/${edge.node.id}`}
                    className="group"
                  >
                    <div className="relative aspect-[2/3] rounded-[4px] overflow-hidden border border-white/5 mb-2">
                      <img 
                        src={edge.node.coverImage?.large} 
                        alt={edge.node.title?.romaji}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">{edge.characterRole}</span>
                        <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Tv size={10} /> {edge.node.format}</span>
                          {edge.node.averageScore && <span className="flex items-center gap-1"><Star size={10} fill="currentColor" className="text-yellow-500" /> {edge.node.averageScore}%</span>}
                        </div>
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-white/70 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                      {getTitle(edge.node.title)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-12">
            {/* Voice Actors Section */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-[3px] h-5 bg-red-600 rounded-full" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Voice Actors</h2>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  // Extract unique voice actors from all media appearances
                  const vas = [];
                  const seen = new Set();
                  char.media?.edges?.forEach(edge => {
                    edge.voiceActors?.forEach(va => {
                      if (!seen.has(va.id)) {
                        seen.add(va.id);
                        vas.push(va);
                      }
                    });
                  });

                  return vas.length > 0 ? vas.map((va) => (
                    <Link 
                      key={va.id} 
                      to={`/staff/${va.id}`}
                      className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-[4px] hover:bg-white/[0.08] hover:border-red-600/30 transition-all group cursor-pointer"
                    >
                      <img 
                        src={va.image?.large} 
                        alt={va.name?.full} 
                        className="w-16 h-16 object-cover rounded-[3px] shadow-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[14px] font-black text-white group-hover:text-red-500 transition-colors uppercase leading-tight">
                          {va.name?.full}
                        </p>
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-1">
                          {va.name?.native}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2">
                          <span className="px-1.5 py-0.5 bg-red-600/10 text-red-500 text-[10px] font-bold uppercase rounded-[2px] flex items-center gap-1">
                            <Activity size={10} />
                            Japanese
                          </span>
                        </div>
                      </div>
                    </Link>
                  )) : (
                    <div className="p-8 text-center bg-white/5 rounded-[4px] border border-dashed border-white/10">
                      <p className="text-white/20 text-[12px] font-bold uppercase tracking-widest">No Voice Actor Found</p>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Quote / Fun Fact Placeholder */}
            {char.description?.includes("quote") && (
              <section className="bg-gradient-to-br from-red-600/20 to-transparent p-6 rounded-[8px] border border-red-600/10 grayscale-[0.5] hover:grayscale-0 transition-all">
                <Info className="text-red-600 mb-4" size={24} />
                <p className="text-[13px] text-white/80 italic leading-relaxed">
                  "This character has been favorited by {char.favourites?.toLocaleString()} AniList users across the globe."
                </p>
              </section>
            )}
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
