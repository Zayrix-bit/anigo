import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Heart, Info, Tv } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

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
        { name: "Discord", path: "https://discord.com", icon: MessageSquare },
        { name: "Reddit", path: "https://reddit.com", icon: Heart },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Terms of Service", path: "#", icon: Tv },
        { name: "DMCA", path: "/dmca", icon: Info },
        { name: "Contact Us", path: "#" },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#080808] pt-10 md:pt-20 pb-8 md:pb-10 mt-10 md:mt-20 lg:mt-32 overflow-hidden border-t border-white/5">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />

      {/* Professional Watermark Background */}
      <div className="absolute inset-0 hidden md:flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
        <span className="text-[250px] lg:text-[350px] font-black tracking-tight uppercase whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.02)' }}>
          AniXO
        </span>
      </div>

      <div className="max-w-[1720px] mx-auto px-4 md:px-10 lg:px-16 relative z-10">

        {/* SEO About Section */}
        <article className="mb-8 md:mb-14 pb-6 md:pb-10 border-b border-white/5">
          <h2 className="text-[12px] md:text-[16px] font-medium text-white/60 mb-2 md:mb-4 tracking-wide">
            AniXO – Watch Free Anime Online in HD
          </h2>
          <p className="text-[11px] md:text-[13px] text-white/35 leading-[1.7] md:leading-[1.8] max-w-[900px] font-normal">
            AniXO is a free anime streaming site where you can watch subbed and dubbed anime online in high definition.
            Enjoy the latest episodes of popular anime series like One Piece, Demon Slayer, Jujutsu Kaisen, Attack on Titan,
            My Hero Academia, Naruto Shippuden, Dragon Ball Super, and thousands more — all without ads or interruptions.
            Our library is updated daily with new releases, seasonal anime, movies, OVAs, and ONAs.
            Whether you prefer English subtitles or dubbed audio, AniXO delivers a premium, buffer-free viewing experience
            on desktop and mobile devices. Join millions of anime fans who trust AniXO as their go-to destination for anime streaming.
          </p>
        </article>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-12 lg:gap-8 mb-8 md:mb-14">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 lg:col-span-3 flex md:flex-col items-center md:items-start gap-4 md:gap-0 md:space-y-6">
            <Link
              to="/home"
              onClick={() => window.scrollTo(0, 0)}
              className="flex items-center shrink-0"
              aria-label="AniXO Home"
            >
              <img
                src="/logo.png"
                alt="AniXO - Free Anime Streaming"
                className="h-[60px] md:h-[100px] object-contain drop-shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:scale-105 transition"
              />
            </Link>

            <div className="flex gap-3 md:gap-4 md:pt-2">
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Join AniXO Discord">
                <MessageSquare className="text-white/20 hover:text-[#5865F2] transition cursor-pointer" size={18} />
              </a>
              <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" aria-label="AniXO on Reddit">
                <Heart className="text-white/20 hover:text-red-600 transition cursor-pointer" size={18} />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="col-span-2 md:col-span-1 lg:col-span-5 grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-8">
            {footerLinks.map((section) => (
              <nav key={section.title} className="space-y-3 md:space-y-5" aria-label={section.title}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/80">
                  {section.title}
                </h3>

                <ul className="space-y-2 md:space-y-3">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    const isExternal = link.path.startsWith("http");
                    const isActive = location.pathname === link.path;

                    const baseClass =
                      "group flex items-center gap-2 text-[12px] font-bold transition-all duration-300 hover:translate-x-1";
                    const colorClass = isActive
                      ? "text-white"
                      : "text-white/30 hover:text-white";

                    if (isExternal) {
                      return (
                        <li key={link.name}>
                          <a
                            href={link.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${baseClass} ${colorClass}`}
                          >
                            {Icon && <Icon className="text-white/10 group-hover:text-red-500 transition" size={12} />}
                            {link.name}
                          </a>
                        </li>
                      );
                    }

                    return (
                      <li key={link.name}>
                        <Link to={link.path} className={`${baseClass} ${colorClass}`}>
                          {Icon && <Icon className="text-white/10 group-hover:text-red-500 transition" size={12} />}
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}
          </div>

          {/* Popular Genres */}
          <nav className="col-span-2 md:col-span-1 lg:col-span-4 space-y-3 md:space-y-5" aria-label="Popular Anime Genres">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/80">
              Popular Genres
            </h3>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-1 md:flex-wrap md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0">
              {["Action", "Romance", "Comedy", "Fantasy", "Sci-Fi", "Slice of Life", "Horror", "Drama", "Mecha", "Sports", "Thriller", "Supernatural"].map((genre) => (
                <Link
                  key={genre}
                  to={`/browse?genres=${genre}`}
                  className="text-[10px] font-bold text-white/25 bg-white/[0.03] border border-white/5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[3px] hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition-all whitespace-nowrap shrink-0 md:shrink"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/20">
            <span>&copy; {currentYear} AniXO</span>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <span className="flex items-center gap-1">
              Made with <Heart size={10} className="text-red-600" fill="currentColor" /> by the community
            </span>
          </div>

          <p className="text-[10px] md:text-[12px] text-white/30 text-center md:text-right max-w-lg italic select-none animate-[breath_4s_ease-in-out_infinite]">
            Disclaimer: AniXO does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
          <style>{`
            @keyframes breath {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    </footer>
  );
}