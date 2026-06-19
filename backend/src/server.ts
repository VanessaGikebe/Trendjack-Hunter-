import "dotenv/config";
import express from "express";
import cors from "cors";
import { writeBrief, scoreTrend } from "./claude.js";
import { fetchRedditTrends } from "./sources/reddit.js";
import { fetchNewsTrends } from "./sources/news.js";
import { getCachedScore, setCachedScore } from "./cache.js";
import { fakeTrends } from "./fakeTrends.js";
import type { Trend, RawTrend } from "./types.js";

const app = express();
const PORT = 3001;

// /trends tuning - keep cost/latency bounded (CLAUDE.md Hard constraints).
const SCORE_LIMIT = 25; // only score the first N merged items, not all of them
const SCORE_CONCURRENCY = 5; // parallel Gemini calls at a time
const MIN_SCORE = 50; // drop anything below this
const TOP_N = 10; // return at most this many

// Run an async mapper over items with bounded concurrency.
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

app.use(cors()); // frontend runs on a different URL (port 3000)
app.use(express.json({ limit: "1mb" }));

// Frontend can check we're up.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Takes one Trend in the body, fills its brief via writeBrief, returns it.
app.post("/brief", async (req, res) => {
  const trend = req.body as Trend;

  if (!trend || typeof trend.title !== "string" || typeof trend.raw_text !== "string") {
    return res.status(400).json({ error: "Body must be a Trend (needs title + raw_text)." });
  }

  try {
    const withBrief = await writeBrief(trend);
    res.json(withBrief);
  } catch (err) {
    // Fail soft - never crash the server on one bad brief.
    console.error("POST /brief failed:", err);
    res.status(502).json({ error: "Brief generation failed.", detail: String(err) });
  }
});

// Pull sources -> dedupe -> score (cached) -> filter -> sort -> top N.
// brief is NOT generated here (only on /brief). Fails soft: worst case is [].
// Shared by GET /trends and the boot warm-up so both fill the same id-cache.
async function computeTrends(): Promise<Trend[]> {
  // Sources already fail soft (return []), but guard anyway so one rejecting
  // never sinks the endpoint.
  const [reddit, news] = await Promise.all([
    fetchRedditTrends().catch((err) => {
      console.warn("[trends] reddit source failed:", String(err));
      return [] as RawTrend[];
    }),
    fetchNewsTrends().catch((err) => {
      console.warn("[trends] news source failed:", String(err));
      return [] as RawTrend[];
    }),
  ]);

  // Merge + dedupe by id (stable hash of source+title).
  const byId = new Map<string, RawTrend>();
  for (const raw of [...reddit, ...news]) {
    if (!byId.has(raw.id)) byId.set(raw.id, raw);
  }
  const merged = [...byId.values()];

  // Cap how many we actually score, for cost/latency.
  const toScore = merged.slice(0, SCORE_LIMIT);

  // Score each (cache by id so we never re-score). Per-item fail soft: a
  // scoring error logs and yields null, which we filter out below.
  const scored = await mapLimit(toScore, SCORE_CONCURRENCY, async (raw) => {
    try {
      let score = getCachedScore(raw.id);
      if (!score) {
        score = await scoreTrend(raw);
        setCachedScore(raw.id, score);
      }
      const trend: Trend = { ...raw, ...score, brief: null };
      return trend;
    } catch (err) {
      console.warn(`[trends] scoring ${raw.id} failed:`, String(err));
      return null;
    }
  });

  const top = scored
    .filter((t): t is Trend => t !== null)
    .filter((t) => t.relevance_score >= MIN_SCORE)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, TOP_N);

  // Never show an empty feed at demo time. If the live pipeline returns nothing
  // (sources blocked, quota exhausted, all below threshold), serve the hardcoded
  // fake trends, tagged seed:true so the frontend / we know they're seeds.
  if (top.length === 0) {
    console.warn("[trends] live pipeline empty - falling back to seed trends");
    return fakeTrends.map((t) => ({ ...t, seed: true as const }));
  }

  return top;
}

app.get("/trends", async (_req, res) => {
  try {
    res.json(await computeTrends());
  } catch (err) {
    // Last-resort guard - should be unreachable given the per-step catches.
    console.error("GET /trends failed:", err);
    res.json([]); // fail soft: never 500
  }
});

app.listen(PORT, () => {
  console.log(`TrendJack backend listening on http://localhost:${PORT}`);

  // Warm-up: compute /trends once on boot so scores (and the news cache) are
  // populated before any real request arrives. Fire-and-forget, fails soft.
  computeTrends()
    .then((trends) => console.log(`[warmup] /trends primed: ${trends.length} trends cached`))
    .catch((err) => console.warn("[warmup] failed (will compute on first request):", String(err)));
});
