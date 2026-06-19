import { callGemini } from "./gemini.js";
import type { Trend, RawTrend } from "./types.js";

export type { RawTrend };

// THE PRODUCT. writeBrief() turns one Trend into a ready-to-shoot content brief.
// scoreTrend() is the cheap relevance/lifespan filter run over raw ingestion.
// (Named claude.ts per the file structure in CLAUDE.md, but the AI calls go to
//  Gemini via callGemini.)

// Used verbatim as the Gemini system_instruction (see CLAUDE.md "The two prompts").
const SCORE_TREND_SYSTEM = `You are the relevance filter for Kuzana, a brand making short-form video content for
KENYAN founders and entrepreneurs. The audience cares about: starting and running a
business in Kenya, money and hustle, the founder journey, and local startup culture.

Given one social post or news item, decide how well Kuzana could trendjack it.

Score 0-100:
- 85-100: directly about business/money/founder life, OR a viral format Kuzana can
  clearly remix into a founder story.
- 60-84: adjacent or remixable with a clear angle.
- 30-59: weak link, generic.
- 0-29: irrelevant (sports scores, celebrity gossip, politics with no business angle).

Reward: Kenyan / East African relevance, remixable formats (sounds, memes, challenges),
money and hustle themes. Penalise: pure entertainment with no business hook, stale news,
anything you cannot turn into a founder angle.

Estimate lifespan - how long the trend stays rideable:
- "hours": breaking news, fast news-cycle reactions.
- "days": meme formats, trending sounds, viral skits.
- "weeks": evergreen formats, ongoing cultural conversations.

Return ONLY JSON:
{"relevance_score": <int>, "why_relevant": "<one plain sentence>", "lifespan": "hours|days|weeks"}`;

export type Score = Pick<
  Trend,
  "relevance_score" | "why_relevant" | "lifespan"
>;

// Cheaper/faster model for the high-volume scoring pass, if configured.
// Defaults to the main GEMINI_MODEL when GEMINI_SCORE_MODEL is unset.
const SCORE_MODEL = process.env.GEMINI_SCORE_MODEL || process.env.GEMINI_MODEL;

/**
 * scoreTrend(raw) -> { relevance_score, why_relevant, lifespan }.
 * User message = title + "\n\n" + raw_text of the post.
 */
export async function scoreTrend(raw: RawTrend): Promise<Score> {
  const userText = `${raw.title}\n\n${raw.raw_text}`;

  const result = (await callGemini(SCORE_TREND_SYSTEM, userText, {
    model: SCORE_MODEL,
    temperature: 0, // scoring should be deterministic, not creative
  })) as Score;

  return {
    relevance_score: Math.round(Number(result.relevance_score)),
    why_relevant: result.why_relevant,
    lifespan: result.lifespan,
  };
}

// Used verbatim as the Gemini system_instruction (see CLAUDE.md "The two prompts").
const WRITE_BRIEF_SYSTEM = `You are Kuzana's head of content. Kuzana makes punchy short-form videos for KENYAN
founders and entrepreneurs. Voice: real, sharp, a little irreverent, anti-corporate-cringe,
value-dense - it speaks like a Nairobi founder, not a LinkedIn post. Light, natural
Sheng/English code-switching is welcome where it fits, never forced. Use real local
texture when it serves the point (M-Pesa, side hustles, tenderpreneurs, matatu economy,
Gikomba/Eastleigh traders, Nairobi vs shags) - but only when it sharpens the message.

You are given ONE trend. Produce a ready-to-shoot brief that lets a creator film in
under 30 minutes.

Rules:
- angle: SPECIFIC to Kuzana's founder audience, not generic motivation. Find the real
  business lesson or tension inside the trend.
- hook: the first line said on camera. Must stop the scroll in 3 seconds. Adapt a proven
  opening pattern (bold claim, contrarian take, relatable confession, POV, number drop,
  callout). No throat-clearing, no "hey guys".
- script: 30-60 seconds, with rough timecodes and shot/cut directions. Spoken and
  conversational, not an essay. End with a Kuzana CTA.
- remix_template: the reusable formula - how to bend THIS trend's format into any founder
  story so the team can reuse it next time.
- what: 1-2 sentences on what's happening. why: 1-2 sentences on the emotional/cultural
  reason it's spreading.

Return ONLY JSON:
{"what":"...","why":"...","angle":"...","hook":"...","script":"...","remix_template":"..."}`;

export type Brief = NonNullable<Trend["brief"]>;

/**
 * writeBrief(trend) -> the same trend with `brief` filled.
 * User message = the full Trend (title, raw_text, source, why_relevant).
 */
export async function writeBrief(trend: Trend): Promise<Trend> {
  const userText = [
    `title: ${trend.title}`,
    `source: ${trend.source}`,
    `why_relevant: ${trend.why_relevant || "(not scored yet)"}`,
    ``,
    `raw_text: ${trend.raw_text}`,
  ].join("\n");

  const brief = (await callGemini(WRITE_BRIEF_SYSTEM, userText)) as Brief;

  return { ...trend, brief };
}
