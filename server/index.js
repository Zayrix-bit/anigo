import express from "express";
import cors from "cors";
import { META, ANIME } from "@consumet/extensions";
import process from "node:process";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60;

app.get("/api/check-dub/:anilistId", async (req, res) => {
  const { anilistId } = req.params;

  const cached = cache.get(anilistId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const anilist = new META.Anilist();
    let episodes = 0;
    try {
      const info = await anilist.fetchAnimeInfo(anilistId);
      episodes = info?.episodes ?? 0;
    } catch {
      const fallback = { anilistId, hasSub: true, hasDub: false, subCount: 0, dubCount: 0 };
      cache.set(anilistId, { data: fallback, timestamp: Date.now() });
      return res.json(fallback);
    }

    const result = {
      anilistId,
      hasSub: true,
      hasDub: true,
      subCount: episodes,
      dubCount: episodes,
    };

    cache.set(anilistId, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch {
    return res.status(500).json({
      error: "Failed to check dub availability",
      hasSub: true,
      hasDub: true,
    });
  }
});

app.get("/api/recent-dub", async (req, res) => {
  try {
    const gogo = new ANIME.Gogoanime();
    const data = await gogo.fetchRecentEpisodes(1, 2); // type 2 = Dub
    
    // Map Consumet results to AniList-like objects for frontend compatibility
    const results = data.results.map(item => ({
      id: item.id, // Consumet ID
      title: { 
        romaji: item.title,
        english: item.title 
      },
      coverImage: {
        large: item.image,
        extraLarge: item.image
      },
      episodes: item.episodeNumber,
      format: "TV",
      status: "RELEASING"
    }));

    res.json({ media: results });
  } catch (err) {
    console.error("Consumet recent-dub error:", err);
    res.status(500).json({ error: "Failed to fetch recent dubs" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`🚀 AniXO Server running on http://localhost:${PORT}`);
  console.log(`📡 Dub check endpoint: http://localhost:${PORT}/api/check-dub/:anilistId`);
});
