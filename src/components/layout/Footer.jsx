import { Link } from "react-router-dom";
import { MessageSquare, Heart, Info, Tv } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Navigation",
      links: [
        { name: "Home", path: "/home" },
        { name: "Browse", path: "/browse" },
        { name: "Trending", path: "/browse?sort=TRENDING_DESC" },
        { name: "Popular", path: "/browse?sort=POPULAR_DESC" },
        { name: "New Releases", path: "/browse?sort=START_DATE_DESC" },
      ],
    },
    {
      title: "Community",
      links: [
        { name: "Discord", path: "#", icon: MessageSquare },
        { name: "Reddit", path: "#", icon: Heart },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Terms of Service", path: "#", icon: Tv },
        { name: "DMCA", path: "#", icon: Info },
        { name: "Contact Us", path: "#" },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#080808] pt-20 pb-10 mt-20 lg:mt-32 overflow-hidden border-t border-white/5">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
      
      <div className="max-w-[1720px] mx-auto px-4 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-20">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link 
              to="/home" 
              className="flex items-center gap-0 group"
              onClick={() => window.scrollTo(0, 0)}
            >
              <span className="text-[24px] font-black italic text-white leading-none tracking-tight group-hover:text-red-500 transition-colors">Ani</span>
              <span className="text-[24px] font-black italic bg-red-600 text-white px-[5px] py-[3px] rounded-[4px] leading-none ml-[-1px] shadow-lg shadow-red-900/20">XO</span>
            </Link>
            <p className="text-[13px] text-white/40 leading-relaxed font-medium max-w-[280px]">
              AniXo is a premier destination for high-fidelity anime streaming. We provide a seamless, ad-free experience for the global anime community.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <MessageSquare size={18} className="text-white/20 hover:text-[#5865F2] cursor-pointer" />
              <Heart size={18} className="text-white/20 hover:text-red-600 cursor-pointer" />
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.name}>
                      <Link 
                        to={link.path}
                        className="group flex items-center gap-2 text-[12px] font-bold text-white/30 hover:text-white transition-all duration-300"
                      >
                        {Icon && <Icon size={12} className="text-white/10 group-hover:text-red-500 transition-colors" />}
                        <span>{link.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            <span>&copy; {currentYear} AniXO</span>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <span className="flex items-center gap-1 group">
              Made with <Heart size={10} className="text-red-600" fill="currentColor" /> by the community
            </span>
          </div>

          <div className="text-[10px] font-medium text-white/10 text-center md:text-right max-w-md italic select-none">
            Disclaimer: This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </div>
        </div>
      </div>
    </footer>
  );
}
