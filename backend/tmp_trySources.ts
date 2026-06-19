// Throwaway: pull both sources and confirm real data is flowing.
import { fetchRedditTrends } from "./src/sources/reddit.js";
import { fetchNewsTrends } from "./src/sources/news.js";

async function main() {
  const [reddit, news] = await Promise.all([
    fetchRedditTrends(),
    fetchNewsTrends(),
  ]);

  console.log(`\n=== REDDIT: ${reddit.length} raw trends ===`);
  reddit.slice(0, 3).forEach((t, i) => console.log(`  ${i + 1}. [${t.id}] ${t.title}`));

  console.log(`\n=== NEWS: ${news.length} raw trends ===`);
  news.slice(0, 3).forEach((t, i) => console.log(`  ${i + 1}. [${t.id}] ${t.title}`));
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
