# Kuzana TrendJack Hunter — Backend Build Spec

> Overnight hackathon MVP. This is the BACKEND ONLY (a standalone server).
> The frontend is a separate app built by someone else; it talks to us over HTTP.
> Read this whole file before writing code. Build in the EXACT order in "Build order".
> The output layer (the brief) comes first.

---

## What we're building

A backend that watches social platforms + Kenyan news, finds trends relevant to
**Kenyan founders / entrepreneurship / money / business / founder culture**, and for
each trend can output a **ready-to-shoot content brief**: angle, hook, 30-60s script,
and a remix template. The brief is the product. A creator goes from spotting a trend
to a publishable script in under 30 minutes.

## Golden rule (do not violate)

The **brief generator is the product**, not the scrapers. Build and perfect it FIRST
against hardcoded fake trends. Only wire real data sources after a fake trend produces
a script we'd actually film. If ingestion dies at 4am, we can still demo by POSTing a
trend straight to /brief.

---

## Stack (standalone backend - don't deviate)

- **Node.js + TypeScript**, standalone server. NOT Next.js.
- **Express** for the HTTP server.
- **tsx** to run TypeScript directly (no build step).
- **AI = Google Gemini via plain fetch** (free API key, no SDK needed).
  Key in .env as GEMINI_API_KEY.
- **cors** - the frontend runs on a different URL, so CORS must be enabled.
- **dotenv** - load env vars.
- **rss-parser** - Kenyan news feeds.
- HTTP calls use built-in fetch (Node 18+). No axios.
- **NO database.** In-memory Map cache. **NO auth. NO accounts. NO login.**
- Port: **3001** (frontend will use 3000).
- Model: **gemini-2.5-flash** for both scoring and briefs (free tier).
  If that model name errors, check ai.google.dev for the current free "flash" model.

## package.json scripts

    "scripts": { "dev": "tsx watch src/server.ts" }

Run the server with: npm run dev

## Hard constraints

- **Force JSON** from Gemini using generationConfig.responseMimeType = "application/json".
  Still wrap JSON.parse in try/catch; on failure retry once, then skip the item.
- **Cache by trend id** (in-memory Map) - never re-score or re-brief the same id.
- **Fail soft**: one bad post or a dead source must never crash /trends. Log and skip.
- app.use(cors()) so the frontend can call us.
- No secrets in responses. Round any numbers.

---

## How to call Gemini (the ONE helper both AI functions use)

One function callGemini(systemPrompt, userText) -> parsed JSON object:

    POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_API_KEY
    headers: { "content-type": "application/json" }
    body: {
      "system_instruction": { "parts": [{ "text": <systemPrompt> }] },
      "contents":           [{ "parts": [{ "text": <userText> }] }],
      "generationConfig":   { "responseMimeType": "application/json" }
    }

Read the result text at: data.candidates[0].content.parts[0].text  (this is a JSON string).
JSON.parse it. responseMimeType already forces clean JSON, but still parse defensively.

scoreTrend() and writeBrief() are just two callGemini() calls with different system prompts.

---

## Data contract (the ONE object everything passes around)

Top half is filled by ingestion. brief stays null until /brief is called.

    type Trend = {
      id: string;            // stable hash of source+title
      source: "reddit" | "news" | "youtube" | "tiktok";
      title: string;         // post title or trend name
      artifact_url: string;  // the MEME/image/video thumbnail - judges want to SEE this
      link: string;          // link to the original post
      raw_text: string;      // post body / description / transcript

      relevance_score: number;   // 0-100, from scoreTrend
      why_relevant: string;      // one line, from scoreTrend
      lifespan: "hours" | "days" | "weeks";  // from scoreTrend

      brief: null | {
        what: string;            // what's happening (1-2 sentences)
        why: string;             // why it's spreading (1-2 sentences)
        angle: string;           // specific Kuzana angle
        hook: string;            // first line said on camera
        script: string;          // 30-60s, with timecodes + shot directions
        remix_template: string;  // reusable formula for this trend format
      };
    };

## File structure

    Backend/
      .env                  GEMINI_API_KEY=...   (+ YOUTUBE_API_KEY, APIFY_TOKEN later)
      package.json
      tsconfig.json
      CLAUDE.md             (this file)
      src/
        server.ts           Express app, routes, cors
        gemini.ts           callGemini() helper
        claude.ts           scoreTrend() + writeBrief() (both call callGemini) - the product
        cache.ts            simple in-memory Map keyed by trend id
        fakeTrends.ts       5 hardcoded Trend objects for building output-first
        sources/
          reddit.ts
          news.ts
          youtube.ts
          tiktok.ts

---

## Build order (one step per Claude Code prompt - stop and review after each)

1. **src/fakeTrends.ts** - 5 hardcoded Trend objects (top half filled, brief: null).
2. **src/gemini.ts + src/claude.ts -> writeBrief(trend)** - THE PRODUCT.
   Perfect it against the fakes. Don't move on until output is genuinely good.
3. **src/server.ts** - minimal Express app on port 3001 with cors, plus
   POST /brief (takes a Trend, returns it with brief filled via writeBrief).
4. **src/claude.ts -> scoreTrend(raw)** - cheap relevance + lifespan call.
5. **src/sources/reddit.ts + src/sources/news.ts** - each returns raw Trend[].
6. **GET /trends** in server.ts - pull sources -> scoreTrend each -> keep top ~10
   by score -> return. (Brief is NOT generated here - only on /brief.)
7. **src/sources/youtube.ts** then **src/sources/tiktok.ts** - only if time remains.

---

## Sources

### Reddit (free, no auth - do first)

    GET https://www.reddit.com/r/{sub}/hot.json?limit=25
    header: User-Agent: kuzana-trendjack/1.0   <-- REQUIRED, Reddit 429s without it
    subs: Kenya, entrepreneur, smallbusiness, startups, sidehustle
    map: data.title->title, "https://reddit.com"+data.permalink->link,
         data.url (if image)->artifact_url, data.selftext->raw_text

### Kenyan news (free, no auth - do first)

Use rss-parser. Find each site's /feed or /rss URL. Targets:
Business Daily, Nation (business), The Standard (business), Techweez.

    map: item.title->title, item.link->link, item.contentSnippet->raw_text
    artifact_url: item.enclosure?.url ?? ""   (news may have no image - fine)

### YouTube (free official API - if time)

Enable "YouTube Data API v3" in Google Cloud, make an API key -> .env YOUTUBE_API_KEY.

    GET https://www.googleapis.com/youtube/v3/search
      ?part=snippet&type=video&order=date&regionCode=KE&relevanceLanguage=en
      &q=kenya business OR entrepreneur OR hustle&maxResults=25&key=KEY
    map: snippet.title->title, snippet.thumbnails.high.url->artifact_url,
         snippet.description->raw_text, "https://youtube.com/watch?v="+id.videoId->link

### TikTok (NO hand-scraping - Apify only, if time)

Do not build a TikTok scraper (no Puppeteer/Playwright/Cheerio). Call a pre-built Apify Actor:

    POST https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token=APIFY_TOKEN
    body: { "hashtags": ["kenyanbusiness","hustle","sidehustle"], "resultsPerPage": 30 }
    map: caption/text->title+raw_text, webVideoUrl->link, cover image->artifact_url

(Confirm the exact ACTOR_ID and input fields from the Apify store before coding.)

---

## The two prompts (these ARE the product - use verbatim as Gemini system_instruction)

### scoreTrend - system prompt

    You are the relevance filter for Kuzana, a brand making short-form video content for
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
    {"relevance_score": <int>, "why_relevant": "<one plain sentence>", "lifespan": "hours|days|weeks"}

User message = title + "\n\n" + raw_text of the post.

### writeBrief - system prompt

    You are Kuzana's head of content. Kuzana makes punchy short-form videos for KENYAN
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
    {"what":"...","why":"...","angle":"...","hook":"...","script":"...","remix_template":"..."}

User message = the full Trend (title, raw_text, source, why_relevant).

---

## Endpoints (give these to the frontend person)

- GET  /trends -> Trend[] (top ~10, brief = null), sorted by relevance_score desc.
- POST /brief  -> body is one Trend; returns the same Trend with brief filled.
- GET  /health -> { ok: true } (so the frontend can check we're up).

Base URL in dev: http://localhost:3001

## Definition of done (the demo path - protect this above all)

1. GET /trends returns real, scored, Kenyan-relevant trends with images.
2. POST /brief returns angle + hook + script + remix for a clicked trend.
3. One trend produces a brief good enough to film a 15s phone video from, live.
4. Server runs with npm run dev and the frontend can reach it (cors works).

## How to drive me (Claude Code)

- I auto-read this file every session - never paste it again.
- Give me ONE numbered build step per prompt. After each, stop and show output.
- Don't read node_modules. Don't refactor or rename things unprompted.
- This is a backend only - never create frontend/React/Next.js files.
- If Gemini returns non-JSON, fix the prompt/parse - don't add a library.
