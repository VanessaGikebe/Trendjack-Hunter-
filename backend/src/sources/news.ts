import { createHash } from "node:crypto";
import Parser from "rss-parser";
import type { RawTrend } from "../types.js";

// Kenyan news via RSS - free, no auth (see CLAUDE.md "Sources > Kenyan news").
// We try a handful of feeds and skip any that fail, so we degrade gracefully
// if one site changes or drops its feed overnight.
// URLs confirmed returning valid RSS at build time. We over-provide and skip
// failures, so losing one overnight still leaves data flowing.
const FEEDS: { name: string; url: string }[] = [
  { name: "Business Daily", url: "https://www.businessdailyafrica.com/bd/rss.xml" },
  { name: "The Standard Business", url: "https://www.standardmedia.co.ke/rss/business.php" },
  { name: "Capital Business", url: "https://www.capitalfm.co.ke/business/feed/" },
  { name: "Tuko", url: "https://www.tuko.co.ke/rss/all.rss" },
  // best-effort extras (may 403 / change feed shape) - skipped if they fail:
  { name: "Techweez", url: "https://techweez.com/feed/" },
  { name: "Nation Business", url: "https://nation.africa/kenya/business/rss" },
];

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "kuzana-trendjack/1.0" },
});

function stableId(source: string, title: string): string {
  return createHash("sha1").update(`${source}:${title}`).digest("hex").slice(0, 12);
}

// Pull one feed -> RawTrend[]. Fails soft: a dead feed logs a warning, yields [].
async function fetchFeed(name: string, url: string): Promise<RawTrend[]> {
  try {
    const feed = await parser.parseURL(url);
    const items = feed?.items ?? [];

    const out: RawTrend[] = [];
    for (const item of items) {
      // fail soft per item: skip anything missing a title
      if (!item?.title) continue;
      out.push({
        id: stableId("news", item.title),
        source: "news",
        title: item.title,
        artifact_url: item.enclosure?.url ?? "", // news often has no image - fine
        link: item.link ?? "",
        raw_text: item.contentSnippet ?? "",
      });
    }
    console.log(`[news] ${name}: ${out.length} items`);
    return out;
  } catch (err) {
    console.warn(`[news] ${name} (${url}) failed: ${String(err)} - skipping`);
    return [];
  }
}

async function fetchNewsTrendsFresh(): Promise<RawTrend[]> {
  const perFeed = await Promise.all(FEEDS.map((f) => fetchFeed(f.name, f.url)));
  return perFeed.flat();
}

// 5-minute in-memory cache on the merged news fetch, so repeat /trends calls
// skip the RSS round-trip. News doesn't change minute-to-minute, so this is safe.
const NEWS_TTL_MS = 5 * 60 * 1000;
let newsCache: { at: number; data: RawTrend[] } | null = null;

/**
 * Fetch recent items across the Kenyan news feeds and return them as raw trends
 * (top half only, no scores). Cached for 5 minutes. Never throws - dead feeds
 * are skipped. A fresh fetch that yields nothing won't overwrite a good cache.
 */
export async function fetchNewsTrends(): Promise<RawTrend[]> {
  const now = Date.now();
  if (newsCache && now - newsCache.at < NEWS_TTL_MS) {
    return newsCache.data;
  }

  const data = await fetchNewsTrendsFresh();

  // Only refresh the cache when we actually got items - if every feed 403s this
  // round, keep serving the last good batch rather than caching an empty list.
  if (data.length > 0 || !newsCache) {
    newsCache = { at: now, data };
  }
  return newsCache.data;
}
