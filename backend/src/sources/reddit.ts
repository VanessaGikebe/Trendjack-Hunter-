import { createHash } from "node:crypto";
import type { RawTrend } from "../types.js";

// Reddit JSON endpoint - free, no auth. The User-Agent header is REQUIRED;
// Reddit 429s anonymous default agents (see CLAUDE.md "Sources > Reddit").
const SUBS = ["Kenya", "entrepreneur", "smallbusiness", "startups", "sidehustle"];
const USER_AGENT = "kuzana-trendjack/1.0";

// Stable id = hash of source+title, so the same post always maps to the same id.
function stableId(source: string, title: string): string {
  return createHash("sha1").update(`${source}:${title}`).digest("hex").slice(0, 12);
}

// data.url only counts as an artifact if it actually points at an image.
function imageArtifact(d: any): string {
  const url: string = d?.url_overridden_by_dest || d?.url || "";
  if (typeof url !== "string") return "";
  if (d?.post_hint === "image") return url;
  if (/\.(jpe?g|png|gif|webp)$/i.test(url)) return url;
  if (/(?:i\.redd\.it|i\.imgur\.com)/.test(url)) return url;
  return "";
}

// Pull one sub's hot posts -> RawTrend[]. Fails soft: a dead/rate-limited sub
// logs a warning and yields [] rather than throwing.
async function fetchSub(sub: string): Promise<RawTrend[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.warn(`[reddit] r/${sub} HTTP ${res.status} - skipping`);
      return [];
    }

    const json: any = await res.json();
    const children: any[] = json?.data?.children ?? [];

    const out: RawTrend[] = [];
    for (const child of children) {
      const d = child?.data;
      // fail soft per post: one malformed item must not kill the sub
      if (!d || typeof d.title !== "string") continue;
      out.push({
        id: stableId("reddit", d.title),
        source: "reddit",
        title: d.title,
        artifact_url: imageArtifact(d),
        link: d.permalink ? `https://reddit.com${d.permalink}` : (d.url ?? ""),
        raw_text: typeof d.selftext === "string" ? d.selftext : "",
      });
    }
    return out;
  } catch (err) {
    console.warn(`[reddit] r/${sub} failed: ${String(err)} - skipping`);
    return [];
  }
}

/**
 * Fetch hot posts across all target subs and return them as raw trends
 * (top half only, no scores). Never throws - dead subs are skipped.
 */
export async function fetchRedditTrends(): Promise<RawTrend[]> {
  const perSub = await Promise.all(SUBS.map(fetchSub));
  return perSub.flat();
}
