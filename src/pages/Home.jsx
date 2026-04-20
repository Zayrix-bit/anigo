import { useQuery } from "@tanstack/react-query";
import {
  getTrendingAnime,
  getPopularAnime,
  getNewReleases,
  getPopularThisSeason,
} from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/home/Hero";
import AnimeRow from "../components/home/AnimeRow";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AlphabetNav from "../components/home/AlphabetNav";
import EstimatedSchedule from "../components/home/EstimatedSchedule";

export default function Home() {
  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ["trending"],
    queryFn: getTrendingAnime,
  });

  const { data: popular = [], isLoading: loadingPopular } = useQuery({
    queryKey: ["popular"],
    queryFn: getPopularAnime,
  });

  const { data: popularThisSeason = [], isLoading: loadingSeason } = useQuery({
    queryKey: ["popularThisSeason"],
    queryFn: getPopularThisSeason,
  });

  const { data: newReleases = [], isLoading: loadingNew } = useQuery({
    queryKey: ["newReleases"],
    queryFn: getNewReleases,
  });

  /* Hero background images from trending posters */
  const bgImages = trending
    .slice(0, 6)
    .map((a) => a.coverImage?.extraLarge || a.coverImage?.large)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      <Hero bgImages={bgImages} />

      {/* Popular This Season */}
      <AnimeRow title="POPULAR THIS SEASON" data={popularThisSeason} isLoading={loadingSeason} limit={24} />

      {/* Trending */}
      <AnimeRow title="TRENDING NOW" data={trending} isLoading={loadingTrending} limit={24} />

      {/* Three-column section */}
      <ThreeColumnSection
        newReleases={newReleases}
        mostViewed={popular}
        justCompleted={trending}
        isLoading={loadingTrending || loadingPopular || loadingNew}
      />

      {/* Airing Schedule Section */}
      <EstimatedSchedule />

      {/* Alphabet navigation */}
      <AlphabetNav />

      <Footer />
    </div>
  );
}
