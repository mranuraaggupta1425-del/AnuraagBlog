/**
 * generate-and-publish.mjs
 * Generates 5 high-quality blog posts using Claude AI, saves them as MDX,
 * then publishes them to Blogger. Runs daily via GitHub Actions.
 *
 * Usage: node scripts/generate-and-publish.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env.local for local dev (GitHub Actions injects secrets directly)
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

// 20 rotating topics across all requested categories
const TOPICS = [
  { name: "Mechanical and Civil Engineering Innovation",     tags: ["engineering", "innovation", "infrastructure"] },
  { name: "Global Geopolitical Tensions in 2026",           tags: ["geopolitics", "global affairs", "conflict"] },
  { name: "Business Strategy in the Age of AI",             tags: ["business", "strategy", "artificial intelligence"] },
  { name: "Stock Market Trends and Investment Insights",    tags: ["stock market", "investing", "finance"] },
  { name: "Climate and Environment: The 2026 Reality",      tags: ["environment", "climate", "sustainability"] },
  { name: "Shifting Diplomacy: New Alliances and Old Rivals", tags: ["diplomacy", "international relations", "politics"] },
  { name: "Breakthrough Inventions of Early 2026",          tags: ["inventions", "innovation", "technology"] },
  { name: "AI and Machine Learning: Cutting Edge in 2026",  tags: ["artificial intelligence", "machine learning", "technology"] },
  { name: "Space Exploration: The New Race",                tags: ["space", "astronomy", "science"] },
  { name: "Cybersecurity Threats and Solutions Today",      tags: ["cybersecurity", "privacy", "technology"] },
  { name: "Healthcare and Biotechnology Frontiers",         tags: ["healthcare", "biotech", "medicine"] },
  { name: "The Global Energy Transition",                   tags: ["energy", "renewables", "sustainability"] },
  { name: "Trade Wars and Global Economics",                tags: ["economics", "trade", "policy"] },
  { name: "The Future of Electric Vehicles and Mobility",   tags: ["EVs", "transport", "technology"] },
  { name: "Robotics and Automation Reshaping Industry",     tags: ["robotics", "automation", "technology"] },
  { name: "Quantum Computing: Hype vs Reality",             tags: ["quantum computing", "technology", "science"] },
  { name: "Mental Health in a Hyper-Connected World",       tags: ["mental health", "society", "technology"] },
  { name: "The Rise of Sovereign AI Models",                tags: ["artificial intelligence", "geopolitics", "technology"] },
  { name: "Semiconductor Wars: Chips and Global Power",     tags: ["semiconductors", "technology", "geopolitics"] },
  { name: "Water Scarcity: The Silent Crisis",              tags: ["water", "environment", "global affairs"] },
];

// Curated Unsplash photo IDs per category
const PHOTOS = {
  engineering:  ["photo-1581094794329-c8112a89af12", "photo-1518770660439-4636190af475", "photo-1487611459768-bd414656ea10"],
  geopolitics:  ["photo-1529107386315-e1a2ed48a620", "photo-1504711434969-e33886168f5c", "photo-1451187580459-43490279c0fa"],
  business:     ["photo-1507003211169-0a1dd7228f2d", "photo-1460925895917-afdab827c52f", "photo-1556742049-0cfed4f6a45d"],
  finance:      ["photo-1611974789855-9c2a0a7236a3", "photo-1611273426858-450d8e3c9fce", "photo-1590283603385-17ffb3a7f29f"],
  environment:  ["photo-1569163139500-73e1a7c4bd88", "photo-1470115636492-6d2b56f9146d", "photo-1441974231531-c6227db76b6e"],
  ai:           ["photo-1677442135703-1787eea5ce01", "photo-1485827404703-89b55fcc595e", "photo-1620712943543-bcc4688e7485"],
  space:        ["photo-1446776811953-b23d57bd21aa", "photo-1457364559154-aa2644600ebb", "photo-1541873676-a18131494184"],
  healthcare:   ["photo-1576091160550-2173dba999ef", "photo-1559757148-5c350d0d3c56", "photo-1532938911079-1b06ac7ceec7"],
  energy:       ["photo-1509391366360-2e959784a276", "photo-1497435334941-8c899a9bd6b4", "photo-1466611653911-95081537e5b7"],
  robotics:     ["photo-1535378917042-10a22c95931a", "photo-1558618666-fcd25c85cd64", "photo-1563207153-f403bf289096"],
  default:      ["photo-1455390582262-044cdead277a", "photo-1486312338219-ce68d2c6f44d", "photo-1499750310107-5fef28a66643"],
};

function pickPhoto(tags) {
  const t = (tags[0] || "").toLowerCase();
  if (t.includes("engineer"))                                        return PHOTOS.engineering[Math.floor(Math.random() * 3)];
  if (t.includes("geopolit") || t.includes("conflict") || t.includes("diplomacy")) return PHOTOS.geopolitics[Math.floor(Math.random() * 3)];
  if (t.includes("business") || t.includes("strategy"))             return PHOTOS.business[Math.floor(Math.random() * 3)];
  if (t.includes("stock") || t.includes("finance") || t.includes("invest")) return PHOTOS.finance[Math.floor(Math.random() * 3)];
  if (t.includes("environment") || t.includes("climate") || t.includes("water")) return PHOTOS.environment[Math.floor(Math.random() * 3)];
  if (t.includes("artificial") || t.includes("machine") || t.includes("quantum")) return PHOTOS.ai[Math.floor(Math.random() * 3)];
  if (t.includes("space"))                                           return PHOTOS.space[Math.floor(Math.random() * 3)];
  if (t.includes("health") || t.includes("biotech"))                return PHOTOS.healthcare[Math.floor(Math.random() * 3)];
  if (t.includes("energy") || t.includes("renew") || t.includes("ev")) return PHOTOS.energy[Math.floor(Math.random() * 3)];
  if (t.includes("robot") || t.includes("automat"))                 return PHOTOS.robotics[Math.floor(Math.random() * 3)];
  return PHOTOS.default[Math.floor(Math.random() * 3)];
}

async function generatePost(topic, existingSlugs, today) {
  const heroPhoto = pickPhoto(topic.tags);

  const lines = [
    "Write a blog post for Anuraag Gupta personal blog.",
    "Anuraag is analytical, globally minded, writes with clarity and depth, draws on experience across technology and global affairs.",
    "",
    "Topic: " + topic.name,
    "Date: " + today,
    "",
    "Return ONLY valid MDX with frontmatter. No extra commentary. No code fences.",
    "",
    "---",
    "title: \"Your Compelling Title\"",
    "date: \"" + today + "\"",
    "excerpt: \"2-3 sentence hook that makes readers want to keep reading.\"",
    "tags: " + JSON.stringify(topic.tags),
    "image: \"https://images.unsplash.com/" + heroPhoto + "?w=1400&q=80\"",
    "---",
    "",
    "[Write the article body here, 900-1200 words]",
    "",
    "RULES:",
    "1. Hero image MUST be exactly: https://images.unsplash.com/" + heroPhoto + "?w=1400&q=80",
    "2. Add 2-3 inline section images with descriptive captions:",
    "   Format: ![Caption text](https://images.unsplash.com/photo-XXXXXXXXXX?w=1200&q=80)",
    "   Reliable photo IDs to use:",
    "   tech/circuits: photo-1518770660439-4636190af475",
    "   global/maps: photo-1504711434969-e33886168f5c",
    "   business meeting: photo-1460925895917-afdab827c52f",
    "   AI visualization: photo-1677442135703-1787eea5ce01",
    "   nature/environment: photo-1569163139500-73e1a7c4bd88",
    "   space: photo-1446776811953-b23d57bd21aa",
    "   healthcare: photo-1576091160550-2173dba999ef",
    "   energy: photo-1509391366360-2e959784a276",
    "   finance charts: photo-1611974789855-9c2a0a7236a3",
    "   robotics: photo-1535378917042-10a22c95931a",
    "3. Use 3-4 section headings with ##",
    "4. Write in first person where natural; be analytical, not generic",
    "5. End with a personal reflection or forward-looking thought",
    "6. Final line must be (in italic): *The views expressed are my own and reflect my analysis of publicly available information.*",
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: lines.join("\n") }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error("API error: " + JSON.stringify(data));

  const content = data.content[0].text.trim();
  const titleMatch = content.match(/^title:\s*"(.+?)"/m);
  const title = titleMatch ? titleMatch[1] : topic.name;

  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);

  let finalSlug = slug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) finalSlug = slug + "-" + counter++;

  return { slug: finalSlug, content };
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  const postsDir = path.join(ROOT, "content", "blog");
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  const existingSlugs = new Set(
    fs.readdirSync(postsDir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(".mdx", ""))
  );

  const selectedTopics = [...TOPICS].sort(() => Math.random() - 0.5).slice(0, 5);

  console.log("\n Daily Blog Generator — " + today);
  console.log("=".repeat(52));
  console.log("Generating 5 posts with Claude AI...\n");

  const generatedSlugs = new Set(existingSlugs);
  let ok = 0;

  for (let i = 0; i < selectedTopics.length; i++) {
    const topic = selectedTopics[i];
    process.stdout.write("  [" + (i + 1) + "/5] " + topic.name + "... ");
    try {
      const { slug, content } = await generatePost(topic, generatedSlugs, today);
      fs.writeFileSync(path.join(postsDir, slug + ".mdx"), content, "utf-8");
      generatedSlugs.add(slug);
      ok++;
      console.log("saved: " + slug + ".mdx");
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.log("FAILED: " + err.message);
    }
  }

  console.log("\n" + ok + "/5 posts generated");
  console.log("=".repeat(52));
  console.log("Publishing to Blogger...\n");

  execSync("node \"" + path.join(__dirname, "publish-to-blogger.mjs") + "\"", {
    stdio: "inherit",
    cwd: ROOT,
  });

  console.log("\nAll done!");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
