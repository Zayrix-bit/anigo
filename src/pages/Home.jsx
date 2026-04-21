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
  const [activeSeasonTab, setActiveSeasonTab] = useState("All");
  const cardsPerPage = 36;

  // Pagination States
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

  const getStableDubPage = async (page) => {
    const startIndex = (page - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    const collected = [];
    const seen = new Set();
    let sourcePage = 1;
    let guard = 0;

    while (collected.length < endIndex && guard < 20) {
      const dubRes = await getRecentDubs(sourcePage, cardsPerPage);
      const media = dubRes.media || [];

      media.forEach((anime) => {
        const key = String(
          anime.id ?? `${anime.title?.romaji || anime.title?.english || "unknown"}-${anime.episodes || ""}`
        );
        if (seen.has(key)) return;
        seen.add(key);
        collected.push(anime);
      });

      if (!dubRes.pageInfo?.hasNextPage) break;
      sourcePage += 1;
      guard += 1;
    }

    const pageMedia = collected.slice(startIndex, endIndex);
    const hasNextDubPage = collected.length > endIndex || (sourcePage > 1 && guard < 20);
    const dubLastPage = hasNextDubPage ? page + 1 : page;

    return {
      media: pageMedia,
      pageInfo: {
        total: collected.length,
        currentPage: page,
        lastPage: dubLastPage,
        hasNextPage: hasNextDubPage,
        perPage: cardsPerPage,
      },
    };
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
    queryKey: ["popularThisSeason", activeSeasonTab, seasonPage],
    queryFn: async () => {
      if (activeSeasonTab === "Dub") {
        return await getStableDubPage(seasonPage);
      }

      if (activeSeasonTab === "China") {
        const chinaRes = await getBrowseAnime({
          page: seasonPage,
          perPage: cardsPerPage,
          country: "CN",
          sort: ["POPULARITY_DESC"],
        });

        return {
          ...chinaRes,
          media: (chinaRes.media || []).filter((anime) => anime.countryOfOrigin === "CN"),
        };
      }

      return await getPopularThisSeason(seasonPage);
    },
  });
  const popularThisSeason = popularThisSeasonData?.media || [];
  const seasonInfo = popularThisSeasonData?.pageInfo || { lastPage: 1 };

  const { data: newReleasesData = [], isLoading: loadingNew } = useQuery({
    queryKey: ["newReleases"],
    queryFn: () => getNewReleases(1),
  });
  const newReleases = newReleasesData?.media || [];

  /* Hero background images from popular posters */
  const bgImages = popular
    .slice(0, 6)
    .map((a) => a.coverImage?.extraLarge || a.coverImage?.large)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      <Hero bgImages={bgImages} />

      {/* Popular This Season */}
      <div id="popular-season">
        <AnimeRow
          title="POPULAR THIS SEASON"
          data={popularThisSeason}
          isLoading={loadingSeason}
          limit={cardsPerPage}
          tabs={["All", "Sub", "Dub", "China"]}
          activeTab={activeSeasonTab}
          onTabChange={(tab) => {
            setActiveSeasonTab(tab);
            setSeasonPage(1);
          }}
        />
        <Pagination 
          currentPage={seasonPage} 
          totalPages={seasonInfo.lastPage > 4 ? 4 : seasonInfo.lastPage} 
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
          totalPages={trendingInfo.lastPage > 4 ? 4 : trendingInfo.lastPage} 
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
