// Manual Overrides for problematic titles
const MAPPING_OVERRIDES = {
  // Re:Zero Season 2 often maps to Season 3 on Anikai due to title proximity
  "108632": "re-zero-starting-life-in-another-world-season-2", // Re:Zero S2
  "115044": "re-zero-starting-life-in-another-world-season-2", // Re:Zero S2 Part 2
};

function extractSeason(title) {
  if (!title) return 1;
  const t = title.toLowerCase();
  
  // 1. Check for specific common season words first for speed
  if (t.includes(" 2nd season") || t.includes(" season 2") || t.match(/\bs2\b/)) return 2;
  if (t.includes(" 3rd season") || t.includes(" season 3") || t.match(/\bs3\b/)) return 3;
  if (t.includes(" 4th season") || t.includes(" season 4") || t.match(/\bs4\b/)) return 4;

  // 2. Fallback to regex patterns loop
  const patterns = [
    /season\s+(\d+)/,
    /(\d+)(st|nd|rd|th)\s+season/,
    /\bs(\d+)\b/
  ];
  
  for (const p of patterns) {
    const m = t.match(p);
    if (m && m[1]) return parseInt(m[1]);
  }

  // 3. Roman numerals check
  if (t.match(/\bii\b/)) return 2;
  if (t.match(/\biii\b/)) return 3;
  if (t.match(/\biv\b/)) return 4;
  
  return 1;
}

function extractPart(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  const match = t.match(/part\s+(\d+)/) || t.match(/cour\s+(\d+)/) || t.match(/part\s+ii/);
  if (t.includes("part 2") || t.includes("part ii") || t.includes("cour 2")) return 2;
  return match ? parseInt(match[1]) : 1;
}

export function normalizeTitle(raw) {
  if (!raw) return "";
  let title = raw.toLowerCase();
  title = title.replace(/\(.*?\)/g, "");
  title = title.replace(/season\s+(\d+)/g, "s$1");
  title = title.replace(/(\d+)(st|nd|rd|th)\s+season/g, "s$1");
  title = title.replace(/part\s+(\d+)/g, "p$1");
  title = title.replace(/[^a-z0-9]+/g, " ");
  title = title.replace(/\s+/g, " ").trim();
  return title;
}

export function scoreMetadata(anilistData, anikaiInfo) {
  let score = 0;
  if (!anilistData || !anikaiInfo) return 0;

  // 1. Year Comparison
  const targetYear = anilistData.seasonYear || (anilistData.startDate?.year);
  const resultYear = parseInt(anikaiInfo.year);

  if (targetYear && resultYear) {
    if (targetYear === resultYear) {
      score += 60;
    } else if (Math.abs(targetYear - resultYear) <= 1) {
      score += 20;
    } else {
      score -= 50; 
    }
  }

  // 2. Episode Count Comparison
  const targetEps = anilistData.episodes;
  const resultEps = Array.isArray(anikaiInfo.episodes) ? anikaiInfo.episodes.length : 0;

  if (targetEps && resultEps) {
    if (targetEps === resultEps) {
      score += 40;
    } else if (Math.abs(targetEps - resultEps) <= 2) {
      score += 20;
    }
  }

  return score;
}

export function resolveMatch(results, anime, lang = 'sub') {
  if (!Array.isArray(results) || results.length === 0) return [];
  
  // Check Manual Overrides
  if (anime?.id && MAPPING_OVERRIDES[String(anime.id)]) {
    const override = MAPPING_OVERRIDES[String(anime.id)];
    const targetKey = 'slug';
    return results.filter(r => r[targetKey] === override).concat(results.filter(r => r[targetKey] !== override)).slice(0, 3);
  }

  if (!anime) return results.slice(0, 3);

  const isDubRequested = lang.toLowerCase() === 'dub';
  const aniListSeason = extractSeason(anime.title?.english || anime.title?.romaji || "");
  const aniListPart = extractPart(anime.title?.english || anime.title?.romaji || "");

  const titles = [];
  if (anime.title?.english) titles.push(anime.title.english);
  if (anime.title?.romaji) titles.push(anime.title.romaji);
  if (Array.isArray(anime.synonyms)) {
    for (const s of anime.synonyms) {
      if (s) titles.push(s);
    }
  }

  const normalizedTargetSet = new Set(titles.map(normalizeTitle).filter(Boolean));

  const scoredResults = results.map(res => {
    let score = 0;
    const resTitle = res.title.toLowerCase();
    const n = normalizeTitle(res.title);

    // 1. Language matching
    const hasDubTag = resTitle.includes('(dub)') || resTitle.includes('dubbed') || resTitle.includes(' [dub]');
    if (isDubRequested && hasDubTag) score += 50;
    if (!isDubRequested && !hasDubTag) score += 50;

    // 2. Season Matching
    const resSeason = extractSeason(res.title);
    if (resSeason === aniListSeason) score += 100;
    else score -= 150;

    // 3. Part/Cour Matching
    const resPart = extractPart(res.title);
    if (resPart !== null && aniListPart !== null) {
      if (resPart === aniListPart) score += 50;
      else score -= 80;
    }

    // 4. Title proximity
    if (normalizedTargetSet.has(n)) score += 60;
    else {
      for (const target of normalizedTargetSet) {
        if (n.includes(target) || target.includes(n)) {
          score += 30;
          break;
        }
      }
    }

    return { ...res, score };
  });

  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, 3);
}

// Keep the old name as alias for backward compatibility if needed, but we'll update Watch.jsx anyway
export const resolveAnikaiMatch = resolveMatch;
