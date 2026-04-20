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
import Pagination from "../components/common/Pagination";
import ThreeColumnSection from "../components/home/ThreeColumnSection";
import AlphabetNav from "../components/home/AlphabetNav";
import EstimatedSchedule from "../components/home/EstimatedSchedule";

export default function Home() {
  const [activeLatestTab, setActiveLatestTab] = useState("All");

  // Pagination States
  const [latestPage, setLatestPage] = useState(1);
  const [trendingPage, setTrendingPage] = useState(1);
  const [seasonPage, setSeasonPage] = useState(1);

  // Helper to scroll to top of section when page changes
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: "smooth"
      });
    }
  };

  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ["trending", trendingPage],
    queryFn: () => getTrendingAnime(trendingPage),
  });
  const trending = trendingData?.media || [];
  const trendingInfo = trendingData?.pageInfo || { lastPage: 1 };

  const { data: popularData, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular"],
    queryFn: () => getPopularAnime(1),
  });
  const popular = popularData?.media || [];

  const { data: popularThisSeasonData, isLoading: loadingSeason } = useQuery({
    queryKey: ["popularThisSeason", seasonPage],
    queryFn: () => getPopularThisSeason(seasonPage),
  });
  const popularThisSeason = popularThisSeasonData?.media || [];
  const seasonInfo = popularThisSeasonData?.pageInfo || { lastPage: 1 };

  const { data: newReleasesData = [], isLoading: loadingNew } = useQuery({
    queryKey: ["newReleases"],
    queryFn: () => getNewReleases(1),
  });
  const newReleases = newReleasesData?.media || [];

  // Latest Updates query based on active tab
  const { data: latestData, isLoading: loadingLatest } = useQuery({
    queryKey: ["latestUpdates", activeLatestTab, latestPage],
    queryFn: async () => {
      try {
        if (activeLatestTab === "Dub") {
          return await getRecentDubs(latestPage);
        }

        const variables = {
          page: latestPage,
          perPage: 24,
          sort: activeLatestTab === "China"
            ? ["TRENDING_DESC", "POPULARITY_DESC"]
            : ["UPDATED_AT_DESC"],
          isAdult: false,
        };

        if (activeLatestTab === "China") {
          variables.country = "CN";
        }

        return await getBrowseAnime(variables);
      } catch (err) {
        console.error("Latest Updates fetch failed:", err);
        return { media: [], pageInfo: { lastPage: 1 } };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const latestUpdates = latestData?.media || [];
  const latestInfo = latestData?.pageInfo || { lastPage: 1 };

  /* Hero background images from popular posters */
  const bgImages = popular
    .slice(0, 6)
    .map((a) => a.coverImage?.extraLarge || a.coverImage?.large)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      <Hero bgImages={bgImages} />

      {/* Latest Updates */}
      <div id="latest-updates">
        <AnimeRow
          title="LATEST UPDATES"
          data={latestUpdates}
          isLoading={loadingLatest}
          limit={24}
          tabs={["All", "Sub", "Dub", "China"]}
          activeTab={activeLatestTab}
          onTabChange={(tab) => {
            setActiveLatestTab(tab);
            setLatestPage(1);
          }}
        />
        <Pagination 
          currentPage={latestPage} 
          totalPages={latestInfo.lastPage > 10 ? 10 : latestInfo.lastPage} 
          onPageChange={(p) => {
            setLatestPage(p);
            scrollToSection("latest-updates");
          }} 
        />
      </div>

      {/* Popular This Season */}
      <div id="popular-season">
        <AnimeRow title="POPULAR THIS SEASON" data={popularThisSeason} isLoading={loadingSeason} limit={24} />
        <Pagination 
          currentPage={seasonPage} 
          totalPages={seasonInfo.lastPage > 10 ? 10 : seasonInfo.lastPage} 
          onPageChange={(p) => {
            setSeasonPage(p);
            scrollToSection("popular-season");
          }} 
        />
      </div>

      {/* Trending Now */}
      <div id="trending-now">
        <AnimeRow title="TRENDING NOW" data={trending} isLoading={loadingTrending} limit={24} />
        <Pagination 
          currentPage={trendingPage} 
          totalPages={trendingInfo.lastPage > 10 ? 10 : trendingInfo.lastPage} 
          onPageChange={(p) => {
            setTrendingPage(p);
            scrollToSection("trending-now");
          }} 
        />
      </div>

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
