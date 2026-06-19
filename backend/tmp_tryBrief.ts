// Throwaway: run writeBrief on the first fake trend and print the JSON.
import { fakeTrends } from "./src/fakeTrends.js";
import { writeBrief } from "./src/claude.js";

async function main() {
  const result = await writeBrief(fakeTrends[0]);
  console.log(JSON.stringify(result.brief, null, 2));
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
