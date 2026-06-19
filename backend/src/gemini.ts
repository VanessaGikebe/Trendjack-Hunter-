import "dotenv/config";

// The ONE helper both AI functions (scoreTrend + writeBrief) use.
// AI = Google Gemini via plain fetch. No SDK. Key in .env as GEMINI_API_KEY.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TEMPERATURE = Number(process.env.GEMINI_TEMPERATURE ?? 0.7);
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

type CallOpts = {
  model?: string; // override the default model (e.g. a cheaper one for scoring)
  temperature?: number; // override the default temperature
};

/**
 * callGemini(systemPrompt, userText, opts?) -> parsed JSON object.
 * Forces JSON via generationConfig.responseMimeType. Parses defensively:
 * on a parse failure it retries once, then throws (caller decides to skip).
 * opts.model / opts.temperature let a caller pick a cheaper model per call.
 */
export async function callGemini(
  systemPrompt: string,
  userText: string,
  opts: CallOpts = {},
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing from .env");

  const model = opts.model || MODEL;
  const temperature = opts.temperature ?? TEMPERATURE;
  const endpoint = endpointFor(model);

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  };

  // One real attempt + one retry on failure (bad response or unparseable JSON).
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned no text part");

      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      // fall through to retry once
    }
  }
  throw new Error(`callGemini failed after retry: ${String(lastErr)}`);
}
