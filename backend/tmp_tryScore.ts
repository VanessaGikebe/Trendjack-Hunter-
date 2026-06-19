// Throwaway: score 3 sample posts to confirm the relevance filter discriminates.
import { scoreTrend, type RawTrend } from "./src/claude.js";

const samples: { label: string; post: Pick<RawTrend, "title" | "raw_text"> }[] = [
  {
    label: "RELEVANT (business/hustle)",
    post: {
      title: "How I built a 500k/month delivery business in Nairobi with one boda and M-Pesa",
      raw_text:
        "Started with one borrowed motorbike doing deliveries for Gikomba traders. Reinvested every shilling, now I run 12 riders and clear half a mil a month. Here's the exact cashflow system I used to scale without a single bank loan.",
    },
  },
  {
    label: "IRRELEVANT (football score)",
    post: {
      title: "Arsenal beat Manchester City 3-1 in thrilling Premier League clash",
      raw_text:
        "Goals from Saka, Odegaard and Martinelli sealed a dominant win at the Emirates. City pulled one back late through Haaland but it wasn't enough. Arsenal go top of the table.",
    },
  },
  {
    label: "BORDERLINE (viral format, not explicitly business)",
    post: {
      title: "The 'tell me you're broke without telling me you're broke' trend is everywhere",
      raw_text:
        "A viral TikTok format where people show relatable signs of being broke - eating supper for lunch, ignoring the landlord's calls, 'window shopping' on Jumia. The sound is blowing up and easy to remix for any niche.",
    },
  },
];

async function main() {
  for (const { label, post } of samples) {
    const score = await scoreTrend(post);
    console.log(`\n=== ${label} ===`);
    console.log(`title: ${post.title}`);
    console.log(JSON.stringify(score, null, 2));
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
