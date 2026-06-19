// The raw top-half a source produces during ingestion: identity + content,
// but no scores and no brief yet (scoreTrend / writeBrief fill those later).
export type RawTrend = Omit<
  Trend,
  "relevance_score" | "why_relevant" | "lifespan" | "brief"
>;

// The ONE object everything passes around (see CLAUDE.md "Data contract").
// Top half is filled by ingestion. `brief` stays null until /brief is called.
export type Trend = {
  id: string; // stable hash of source+title
  source: "reddit" | "news" | "youtube" | "tiktok";
  title: string; // post title or trend name
  artifact_url: string; // the MEME/image/video thumbnail - judges want to SEE this
  link: string; // link to the original post
  raw_text: string; // post body / description / transcript

  relevance_score: number; // 0-100, from scoreTrend
  why_relevant: string; // one line, from scoreTrend
  lifespan: "hours" | "days" | "weeks"; // from scoreTrend

  brief:
    | null
    | {
        what: string; // what's happening (1-2 sentences)
        why: string; // why it's spreading (1-2 sentences)
        angle: string; // specific Kuzana angle
        hook: string; // first line said on camera
        script: string; // 30-60s, with timecodes + shot directions
        remix_template: string; // reusable formula for this trend format
      };

  seed?: boolean; // true = hardcoded fallback shown when the live pipeline is empty
};
