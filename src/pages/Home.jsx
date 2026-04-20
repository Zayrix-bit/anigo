import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTrendingAnime,
  getPopularAnime,
  getNewReleases,
  getPopularThisSeason,
  getBrowseAnime,
  getRecentDubs,
} from "../services/api";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Hero from "../components/home/Hero";
import AnimeRow from "../components/home/AnimeRow";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AlphabetNav from "../components/home/AlphabetNav";
import EstimatedSchedule from "../components/home/EstimatedSchedule";

export default function Home() {
  const [activeLatestTab, setActiveLatestTab] = useState("All");

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

  // Latest Updates query based on active tab
  const { data: latestUpdates = [], isLoading: loadingLatest } = useQuery({
    queryKey: ["latestUpdates", activeLatestTab],
    queryFn: async () => {
      try {
        if (activeLatestTab === "Dub") {
          const res = await getRecentDubs();
          return res?.media || [];
        }

        const variables = {
          page: 1,
          perPage: 24,
          sort: activeLatestTab === "China" 
                ? ["TRENDING_DESC", "POPULARITY_DESC"] 
                : ["UPDATED_AT_DESC"],
          isAdult: false,
        };
        
        if (activeLatestTab === "China") {
          variables.country = "CN";
        }

        const res = await getBrowseAnime(variables);
        return res?.media || [];
      } catch (err) {
        console.error("Latest Updates fetch failed:", err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /* Hero background images from popular posters */
  const bgImages = popular
    .slice(0, 6)
    .map((a) => a.coverImage?.extraLarge || a.coverImage?.large)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      <Hero bgImages={bgImages} />

      <div className="flex flex-col gap-y-16 mt-8 mb-20">
        {/* Latest Updates */}
        <AnimeRow 
          title="LATEST UPDATES" 
          data={latestUpdates} 
          isLoading={loadingLatest} 
          limit={24}
          tabs={["All", "Sub", "Dub", "China"]}
          activeTab={activeLatestTab}
          onTabChange={(tab) => setActiveLatestTab(tab)}
        />

        {/* Popular This Season */}
        <AnimeRow title="POPULAR THIS SEASON" data={popularThisSeason} isLoading={loadingSeason} limit={24} />

        {/* Trending Now */}
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
      </div>

      <Footer />
    </div>
  );
}
