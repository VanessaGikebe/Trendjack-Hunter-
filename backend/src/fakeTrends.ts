import type { Trend } from "./types.js";

// 5 hardcoded trends for building the brief generator output-first.
// Top half filled, brief: null. These let us perfect writeBrief() before any
// real ingestion exists (the Golden Rule in CLAUDE.md).
export const fakeTrends: Trend[] = [
  {
    id: "fake-reddit-mpesa-side-hustle",
    source: "reddit",
    title: "I quit my 80k corporate job to sell secondhand clothes in Gikomba and now make 3x more",
    artifact_url:
      "https://i.imgur.com/8Qb1aZk.jpeg",
    link: "https://reddit.com/r/Kenya/comments/example1",
    raw_text:
      "Everyone called me crazy for leaving a 'good job' at a bank to hawk mitumba. Six months in, I'm clearing 250k a month on a good month, I employ two people, and I actually understand my customers. The corporate ladder was a lie. AMA about starting a bale business from scratch.",
    relevance_score: 92,
    why_relevant:
      "A first-person Kenyan founder story about quitting corporate to build a profitable hustle - exactly Kuzana's audience.",
    lifespan: "hours",
    brief: null,
  },
  {
    id: "fake-tiktok-pov-broke-founder",
    source: "tiktok",
    title: "POV: your startup just ran out of runway and the M-Pesa says 'Insufficient Balance'",
    artifact_url:
      "https://i.imgur.com/3kLm9pQ.jpeg",
    link: "https://tiktok.com/@example/video/example2",
    raw_text:
      "Trending POV sound where founders act out the exact moment they realised they couldn't make payroll. Comments full of Kenyan founders sharing their own near-death business stories. The audio is a dramatic slowed-down beat with a phone notification ding.",
    relevance_score: 88,
    why_relevant:
      "A viral POV sound that's instantly remixable into a relatable founder cashflow-panic story.",
    lifespan: "days",
    brief: null,
  },
  {
    id: "fake-news-cbk-lowers-rate",
    source: "news",
    title: "Central Bank of Kenya cuts benchmark lending rate, banks expected to lower loan costs",
    artifact_url: "",
    link: "https://businessdailyafrica.com/example3",
    raw_text:
      "The Central Bank of Kenya has lowered its benchmark rate for the third consecutive time, a move analysts say should make borrowing cheaper for small businesses and SMEs. Lenders have been slow to pass on previous cuts, leaving many entrepreneurs still paying high interest on working-capital loans.",
    relevance_score: 84,
    why_relevant:
      "Directly hits founder pockets - cheaper SME borrowing is a money-and-hustle story Kuzana can break down.",
    lifespan: "days",
    brief: null,
  },
  {
    id: "fake-youtube-tenderpreneur-explained",
    source: "youtube",
    title: "How 'tenderpreneurs' actually make their money (and why most go broke)",
    artifact_url:
      "https://i.ytimg.com/vi/example4/hqdefault.jpg",
    link: "https://youtube.com/watch?v=example4",
    raw_text:
      "A 12-minute breakdown of the tender economy in Kenya: how government supply contracts work, why people borrow at 20% to finance them, and the cashflow trap that wipes out 'overnight millionaires'. Lots of comments from people who tried it and lost everything.",
    relevance_score: 86,
    why_relevant:
      "An evergreen Kenyan business explainer on the tender economy and the cashflow trap that breaks founders.",
    lifespan: "weeks",
    brief: null,
  },
  {
    id: "fake-tiktok-glow-up-challenge",
    source: "tiktok",
    title: "The 'first customer vs 1000th customer' glow-up transition challenge",
    artifact_url:
      "https://i.imgur.com/7vRt2wX.jpeg",
    link: "https://tiktok.com/@example/video/example5",
    raw_text:
      "A viral transition format: creators show a messy 'before' (first chaotic day of business) then snap to a polished 'after' (an established operation) on the beat drop. Being used across fashion, fitness, and food. Easy to remix for any founder origin story.",
    relevance_score: 83,
    why_relevant:
      "A remixable transition format that maps cleanly onto any founder's scrappy-start-to-growth origin story.",
    lifespan: "days",
    brief: null,
  },
];
