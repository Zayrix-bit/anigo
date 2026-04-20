// ==========================================
// ANILIST-ONLY API ENGINE
// All data powered by AniList GraphQL
// All network requests use Axios exclusively
// ==========================================

import axios from "axios";

const ANILIST_URL = import.meta.env.VITE_ANILIST_API || "https://graphql.anilist.co";
const ANIXO_SERVER = import.meta.env.PROD ? "" : (import.meta.env.VITE_ANIXO_SERVER || "http://127.0.0.1:5000");
const PYTHON_API = import.meta.env.PROD ? "" : "http://127.0.0.1:5000";

// ==========================================
// ANILIST CORE
// ==========================================

async function fetchFromAniList(query, variables = {}) {
  try {
    const { data } = await axios.post(`${PYTHON_API}/api/anilist/proxy`, { query, variables }, {
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList GraphQL Errors:", data.errors);
      return { media: [], pageInfo: { total: 0 } };
    }
    return data.data?.Page || { media: [], pageInfo: { total: 0 } };
  } catch (err) {
    console.error("AniList Fetch Error:", err);
    return { media: [], pageInfo: { total: 0 } };
  }
}

// ==========================================
// BROWSE QUERIES
// ==========================================

const ANIME_QUERY = `
  query ($page: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: 30) {
      media(type: ANIME, sort: $sort) {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        episodes
        seasonYear
        nextAiringEpisode {
          airingAt
          episode
        }
        averageScore
        favourites
        status
        isAdult
      }
    }
  }
`;

export async function getTrendingAnime() {
  const res = await fetchFromAniList(ANIME_QUERY, { page: 1, sort: ["TRENDING_DESC"] });
  return res.media || [];
}

export async function getPopularAnime() {
  const res = await fetchFromAniList(ANIME_QUERY, { page: 1, sort: ["POPULARITY_DESC"] });
  return res.media || [];
}

export async function getNewReleases() {
  const res = await fetchFromAniList(ANIME_QUERY, { page: 1, sort: ["START_DATE_DESC", "TRENDING_DESC"] });
  return res.media || [];
}

export const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(type: ANIME, search: $search) {
        id
        title { romaji english native }
        coverImage { medium large }
        episodes
        nextAiringEpisode {
          airingAt
          episode
        }
        format
        seasonYear
        averageScore
        isAdult
      }
    }
  }
`;

export async function searchAnime(query) {
  if (!query) return [];
  const res = await fetchFromAniList(SEARCH_QUERY, { search: query });
  return res.media || [];
}

export async function getGenres() {
  const query = `{ GenreCollection }`;
  try {
    const { data } = await axios.post(`${PYTHON_API}/api/anilist/proxy`, { query }, {
      headers: { "Content-Type": "application/json" },
    });
    return data.data?.GenreCollection || [];
  } catch (err) {
    console.error("Error fetching genres:", err);
    return [];
  }
}

export const BROWSE_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $format_in: [MediaFormat], $sort: [MediaSort], $seasonYear: Int, $status: MediaStatus, $genre_in: [String], $tag_in: [String], $season: MediaSeason, $country: CountryCode) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(type: ANIME, search: $search, format_in: $format_in, sort: $sort, seasonYear: $seasonYear, status: $status, genre_in: $genre_in, tag_in: $tag_in, season: $season, countryOfOrigin: $country) {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        episodes
        seasonYear
        genres
        tags { name }
        nextAiringEpisode {
          airingAt
          episode
        }
        averageScore
        status
        isAdult
      }
    }
  }
`;

export function getBrowseAnime(variables) {
  return fetchFromAniList(BROWSE_QUERY, variables);
}

// ==========================================
// MAL (Jikan v4) HYBRID SUPPORT
// Used specifically for genres like Avant Garde
// ==========================================

export const MAL_GENRE_MAP = {
  "Action": 1,
  "Adventure": 2,
  "Avant Garde": 5,
  "Boys Love": 28,
  "Comedy": 4,
  "Demons": 6,
  "Drama": 8,
  "Ecchi": 9,
  "Fantasy": 10,
  "Girls Love": 26,
  "Gourmet": 47,
  "Harem": 35,
  "Horror": 14,
  "Isekai": 62,
  "Iyashikei": 63,
  "Josei": 43,
  "Kids": 15,
  "Magic": 16,
  "Mahou Shoujo": 66,
  "Martial Arts": 17,
  "Mecha": 18,
  "Military": 38,
  "Music": 19,
  "Mystery": 7,
  "Parody": 20,
  "Psychological": 40,
  "Reverse Harem": 73,
  "Romance": 22,
  "School": 23,
  "Sci-Fi": 24,
  "Seinen": 42,
  "Shoujo": 25,
  "Shounen": 27,
  "Slice of Life": 36,
  "Space": 29,
  "Sports": 30,
  "Super Power": 31,
  "Supernatural": 37,
  "Suspense": 41,
  "Thriller": 45,
  "Vampire": 32
};

export async function getBrowseAnimeMAL(variables) {
  const { page = 1, genres = [], search = "", status = "", sort = "popularity" } = variables;
  
  // Map genre names to MAL IDs
  const malGenreIds = genres.map(g => MAL_GENRE_MAP[g]).filter(Boolean);
  
  let url = `https://api.jikan.moe/v4/anime?page=${page}&limit=24`;
  if (search) url += `&q=${encodeURIComponent(search)}`;
  if (malGenreIds.length > 0) url += `&genres=${malGenreIds.join(',')}`;
  
  if (status === "RELEASING") url += "&status=airing";
  if (status === "FINISHED") url += "&status=complete";
  
  if (sort.includes("POPULARITY")) url += "&order_by=popularity&sort=desc";
  else if (sort.includes("SCORE")) url += "&order_by=score&sort=desc";
  else url += "&order_by=popularity&sort=desc";
  
  try {
    const { data } = await axios.get(url);
    return {
      media: data.data.map(item => ({
        id: item.mal_id,
        idMal: item.mal_id,
        isMAL: true,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese
        },
        coverImage: {
          large: item.images.webp.large_image_url || item.images.jpg.large_image_url,
          medium: item.images.webp.image_url || item.images.jpg.image_url
        },
        genres: [
          ...(item.genres || []).map(g => g.name),
          ...(item.themes || []).map(t => t.name),
          ...(item.demographics || []).map(d => d.name)
        ],
        format: item.type?.toUpperCase(),
        episodes: item.episodes,
        seasonYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
        averageScore: item.score ? item.score * 10 : null,
        status: item.status === "Currently Airing" ? "RELEASING" : "FINISHED",
        rating: item.rating ? item.rating.split(' - ')[0].trim() : null,
      })),
      pageInfo: {
        total: data.pagination.items.total,
        currentPage: data.pagination.current_page,
        lastPage: data.pagination.last_visible_page,
        hasNextPage: data.pagination.has_next_page,
      }
    };
  } catch (err) {
    console.error("Jikan API Error:", err);
    throw err;
  }
}

const SEASONAL_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $sort: [MediaSort]) {
    Page(page: 1, perPage: 30) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: $sort) {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        episodes
        nextAiringEpisode {
          airingAt
          episode
        }
        averageScore
        status
        isAdult
      }
    }
  }
`;

export async function getPopularThisSeason() {
  const date = new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  let season = "WINTER";
  if (month >= 2 && month <= 4) season = "SPRING";
  else if (month >= 5 && month <= 7) season = "SUMMER";
  else if (month >= 8 && month <= 10) season = "FALL";
  
  const res = await fetchFromAniList(SEASONAL_QUERY, { 
    season, 
    seasonYear: year,
    sort: ["POPULARITY_DESC"] 
  });
  return res.media || [];
}

export async function getTopRatedAnime() {
  const res = await fetchFromAniList(ANIME_QUERY, { page: 1, sort: ["SCORE_DESC"] });
  return res.media || [];
}

export async function getUpcomingAnime() {
  const res = await fetchFromAniList(ANIME_QUERY, { 
    page: 1, 
    sort: ["POPULARITY_DESC"],
    status: "NOT_YET_RELEASED"
  });
  return res.media || [];
}

const SCHEDULE_QUERY = `
  query ($page: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { total hasNextPage }
      airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          title { romaji english native }
          coverImage { medium }
          format
          popularity
          isAdult
        }
      }
    }
  }
`;

export async function getSchedule(startTimestamp, endTimestamp) {
  try {
    const { data } = await axios.post(`${PYTHON_API}/api/anilist/proxy`, {
      query: SCHEDULE_QUERY,
      variables: {
        page: 1,
        airingAt_greater: startTimestamp,
        airingAt_lesser: endTimestamp,
      },
    }, {
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList Schedule Errors:", data.errors);
      return [];
    }
    return data.data?.Page?.airingSchedules || [];
  } catch (err) {
    console.error("Schedule Fetch Error:", err);
    return [];
  }
}


// ==========================================
// ANIME DETAIL (AniList-powered)
// Deep relations for season navigation
// ==========================================

const DETAIL_QUERY = `
fragment RelationFields on Media {
  id
  idMal
  title { romaji english native }
  coverImage { large }
  episodes
  format
  type
  startDate { year month day }
}

query ($id: Int, $idMal: Int) {
  Media(id: $id, idMal: $idMal, type: ANIME) {
    id
    idMal
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    description
    format
    episodes
    status
    averageScore
    genres
    seasonYear
    isAdult
    countryOfOrigin
    startDate { year month day }
    endDate { year month day }
    duration
    synonyms
    studios {
      edges {
        isMain
        node { name }
      }
    }
    nextAiringEpisode {
      airingAt
      episode
    }
    streamingEpisodes {
      title
      thumbnail
    }
    relations {
      edges {
        relationType
        node {
          ...RelationFields
          relations {
            edges {
              relationType
              node {
                ...RelationFields
                relations {
                  edges {
                    relationType
                    node {
                      ...RelationFields
                      relations {
                        edges {
                          relationType
                          node {
                            ...RelationFields
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    trailer {
      id
      site
      thumbnail
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { large }
        }
        voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
          id
          name { full userPreferred }
          image { large }
        }
      }
    }
    staff(perPage: 6, sort: [RELEVANCE]) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { large }
        }
      }
    }
    recommendations(sort: [RATING_DESC], perPage: 50) {
      nodes {
        mediaRecommendation {
          id
          title { romaji english native }
          coverImage { large }
          format
          episodes
          averageScore
        }
      }
    }
  }
}
`;

export async function getAnimeDetails(id, isMal = false) {
  const variables = isMal ? { idMal: parseInt(id) } : { id: parseInt(id) };
  try {
    const { data } = await axios.post(`${PYTHON_API}/api/anilist/proxy`, {
      query: DETAIL_QUERY,
      variables,
    }, {
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList Detail Errors [ID:", id, "]:", data.errors);
      return null;
    }

    const media = data.data?.Media;
    if (!media) {
      console.warn("AniList Detail: No media found for ID:", id);
      return null;
    }

    // Flatten deep relations for season navigation
    if (media.relations?.edges) {
      const flatRelationsMap = new Map();

      const flattenEdges = (edges) => {
        if (!edges) return;
        edges.forEach(edge => {
          if (!edge.node) return;
          // IMPORTANT: Only include ANIME media. Clicking on Manga/LN causes "Anime Not Found" errors.
          if (edge.node.type !== 'ANIME') return;

          if (!flatRelationsMap.has(edge.node.id) && edge.node.id !== media.id) {
            const cleanNode = { ...edge.node };
            delete cleanNode.relations;
            flatRelationsMap.set(edge.node.id, {
              relationType: edge.relationType,
              node: cleanNode
            });
          }
          if (edge.node.relations?.edges) {
            flattenEdges(edge.node.relations.edges);
          }
        });
      };

      flattenEdges(media.relations.edges);
      media.relations.edges = Array.from(flatRelationsMap.values());
    }

    return media;
  } catch (err) {
    console.error("getAnimeDetails Error:", err);
    return null;
  }
}


// ==========================================
// ANIWATCH MAPPING (via MalSync + aniwatchtv.to)
// Step 1: MAL ID → Aniwatch numeric ID (MalSync)
// Step 2: Aniwatch ID → Episode IDs (aniwatchtv.to)
// ==========================================

export async function getAniwatchId(keyword) {
  if (!keyword) return [];
  try {
    const { data } = await axios.get(`${PYTHON_API}/api/aniwatch/search`, {
      params: { keyword },
    });
    return data.success ? data.results : [];
  } catch (err) {
    console.error("Aniwatch dynamic lookup failed:", err);
    return [];
  }
}

export async function getAnikaiDetails(keyword) {
  if (!keyword) return null;
  try {
    const { data: searchData } = await axios.get(`${PYTHON_API}/api/anikai/search`, {
      params: { keyword }
    });
    if (searchData.success && searchData.results && searchData.results.length > 0) {
      const slug = searchData.results[0].slug;
      const { data: infoData } = await axios.get(`${PYTHON_API}/api/anikai/info/${slug}`);
      if (infoData.success) {
        return infoData;
      }
    }
    return null;
  } catch (err) {
    console.error("Anikai info details failed:", err);
    return null;
  }
}

export async function getAniwatchDetails(keyword) {
  if (!keyword) return null;
  try {
    const { data: searchData } = await axios.get(`${PYTHON_API}/api/aniwatch/search`, {
      params: { keyword }
    });
    if (searchData.success && searchData.aniwatch_id) {
      const { data: infoData } = await axios.get(`${PYTHON_API}/api/aniwatch/info/${searchData.aniwatch_id}`);
      if (infoData.success) {
        return infoData;
      }
    }
    return null;
  } catch (err) {
    console.error("Aniwatch info details failed:", err);
    return null;
  }
}



export async function getAniwatchEpisodes(aniwatchId) {
  if (!aniwatchId) return [];
  try {
    const { data } = await axios.get(`${PYTHON_API}/api/aniwatch/episodes/${aniwatchId}`);
    if (data.success && data.episodes) {
      return data.episodes;
    }
    return [];
  } catch (err) {
    console.error("Aniwatch episodes fetch failed:", err);
    return [];
  }
}


// ==========================================
// MAL EPISODE TITLES (lightweight)
// Only used for episode names — everything else is AniList
// ==========================================

export async function getEpisodeTitles(malId) {
  if (!malId) return [];
  try {
    let allEpisodes = [];
    let page = 1;
    let hasNextPage = true;

    // Fetch up to 3 pages (300 episodes) to respect rate limits
    while (hasNextPage && page <= 3) {
      try {
        const { data: json } = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/episodes`, {
          params: { page },
        });

        if (json.data && json.data.length > 0) {
          allEpisodes = [...allEpisodes, ...json.data];
          hasNextPage = json.pagination?.has_next_page;
          page++;
        } else {
          hasNextPage = false;
        }
      } catch (err) {
        if (err.response?.status === 429) {
          // Rate limited — wait and retry once
          await new Promise(r => setTimeout(r, 1200));
          try {
            const { data: retryJson } = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/episodes`, {
              params: { page },
            });
            if (retryJson.data?.length > 0) {
              allEpisodes = [...allEpisodes, ...retryJson.data];
              hasNextPage = retryJson.pagination?.has_next_page;
              page++;
            } else {
              hasNextPage = false;
            }
          } catch {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      }
    }
    return allEpisodes;
  } catch (err) {
    console.error("MAL Episodes Fetch Error:", err);
    return [];
  }
}

export async function getJikanAnimeDetails(malId) {
  if (!malId) return null;
  try {
    const { data } = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`);
    return data?.data || null;
  } catch (err) {
    console.error("Jikan Anime Details Fetch Error:", err);
    return null;
  }
}
// ==========================================
// CONSUMET BACKEND (Sub/Dub Availability)
// ==========================================

/**
 * Check if an anime has Sub and/or Dub available via the Consumet backend.
 * @param {number|string} anilistId - The AniList ID of the anime
 * @returns {Promise<{hasSub: boolean, hasDub: boolean, subCount: number, dubCount: number}>}
 */
export async function checkDubAvailability(anilistId) {
  try {
    const { data } = await axios.get(`${ANIXO_SERVER}/api/check-dub/${anilistId}`);
    return data;
  } catch (err) {
    console.error("Dub check failed:", err.message);
    // Graceful fallback: assume sub exists and allow dub toggle
    return { hasSub: true, hasDub: true, subCount: 0, dubCount: 0 };
  }
}

export async function getSecondaryEpisodeMeta(title, altTitle = "", kitsuId = "") {
  if (!title && !altTitle && !kitsuId) return {};
  try {
    const { data } = await axios.get(`${ANIXO_SERVER}/api/meta/episodes`, {
      params: { 
        title,
        alt_title: altTitle,
        kitsu_id: kitsuId
      },
    });
    return data;
  } catch (err) {
    console.error("Secondary metadata fetch failed:", err);
    return {};
  }
}

export async function getMalSyncMapping(malId) {
  if (!malId) return null;
  try {
    const { data } = await axios.get(`${ANIXO_SERVER}/api/malsync/${malId}`);
    return data;
  } catch (err) {
    console.error("MalSync mapping failed:", err);
    return null;
  }
}

// ==========================================
// CHARACTER DETAIL (AniList)
// ==========================================

const CHARACTER_QUERY = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name {
        full
        native
        userPreferred
      }
      image {
        large
      }
      description(asHtml: true)
      gender
      age
      dateOfBirth {
        year
        month
        day
      }
      bloodType
      favourites
      media(sort: START_DATE_DESC, type: ANIME, perPage: 25) {
        edges {
          characterRole
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name {
              full
              native
              userPreferred
            }
            image {
              large
            }
          }
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            format
            averageScore
          }
        }
      }
    }
  }
`;

export async function getCharacterDetails(id) {
  if (!id) return null;
  try {
    const { data } = await axios.post(ANILIST_URL, {
      query: CHARACTER_QUERY,
      variables: { id: parseInt(id) },
    }, {
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList Character Errors [ID:", id, "]:", data.errors);
      return null;
    }

    return data.data?.Character || null;
  } catch (err) {
    console.error("getCharacterDetails Error:", err);
    return null;
  }
}

const STAFF_QUERY = `
  query ($id: Int) {
    Staff(id: $id) {
      id
      name {
        full
        native
        userPreferred
      }
      image {
        large
      }
      description(asHtml: true)
      languageV2
      primaryOccupations
      gender
      dateOfBirth {
        year
        month
        day
      }
      dateOfDeath {
        year
        month
        day
      }
      age
      homeTown
      favourites
      characterMedia(sort: START_DATE_DESC, perPage: 50) {
        edges {
          characterRole
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            format
            type
            averageScore
          }
          characters {
            id
            name {
              full
              userPreferred
            }
            image {
              large
            }
          }
        }
      }
    }
  }
`;

export async function getStaffDetails(id) {
  if (!id) return null;
  try {
    const { data } = await axios.post(ANILIST_URL, {
      query: STAFF_QUERY,
      variables: { id: parseInt(id) },
    }, {
      headers: { "Content-Type": "application/json" },
    });

    if (data.errors) {
      console.error("AniList Staff Errors [ID:", id, "]:", data.errors);
      return null;
    }

    return data.data?.Staff || null;
  } catch (err) {
    console.error("getStaffDetails Error:", err);
    return null;
  }
}
