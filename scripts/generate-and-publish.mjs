/**
 * generate-and-publish.mjs
 * Uses Claude AI to write 5 blog posts on rotating topics,
 * saves them as MDX files, then publishes to Blogger.
 *
 * Usage:
 *   node scripts/generate-and-publish.mjs
 *
 * Requires env vars (from .env.local or GitHub Secrets):
 *   ANTHROPIC_API_KEY, BLOGGER_BLOG_ID, BLOGGER_CLIENT_ID,
 *   BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Load .env.local if it exists (skipped on GitHub Actions) ─────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return; // GitHub Actions sets env vars directly
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}
loadEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("❌  ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

// ── Topic Pool ────────────────────────────────────────────────────────────────
const TOPICS = [
  { name: "Engineering Breakthroughs",        tags: ["engineering", "innovation", "technology"] },
  { name: "Global Tensions & Geopolitics",    tags: ["geopolitics", "global affairs", "conflict"] },
  { name: "Business Strategy",                tags: ["business", "strategy", "entrepreneurship"] },
  { name: "Share Market & Financial Trends",  tags: ["finance", "markets", "investing"] },
  { name: "Environment & Climate Change",     tags: ["environment", "climate", "sustainability"] },
  { name: "Changing Diplomacy",               tags: ["diplomacy", "international relations", "politics"] },
  { name: "Recent Inventions & Patents",      tags: ["inventions", "innovation", "technology"] },
  { name: "AI & Machine Learning",            tags: ["artificial intelligence", "machine learning", "technology"] },
  { name: "Space Exploration & Astronomy",    tags: ["space", "astronomy", "science"] },
  { name: "Cybersecurity & Privacy",          tags: ["cybersecurity", "privacy", "technology"] },
  { name: "Healthcare & Biotech",             tags: ["healthcare", "biotech", "medicine"] },
  { name: "Energy Transition",                tags: ["energy", "renewables", "sustainability"] },
  { name: "Economics & Trade Policy",         tags: ["economics", "trade", "policy"] },
  { name: "Education & EdTech",               tags: ["education", "technology", "innovation"] },
  { name: "Robotics & Automation",            tags: ["robotics", "automation", "technology"] },
];

// ── Unsplash image IDs by topic keyword ──────────────────────────────────────
const IMAGES = {
  engineering:   ["photo-1581094794329-c8112a89af12", "photo-1621905251189-08b45d6a269e"],
  geopolitics:   ["photo-1529107386315-e1a2ed48a620", "photo-1504711434969-e33886168f5c"],
  business:      ["photo-1507003211169-0a1dd7228f2d", "photo-1460925895917-afdab827c52f"],
  finance:       ["photo-1611974789855-9c2a0a7236a3", "photo-1611273426858-450d8e3c9fce"],
  environment:   ["photo-1569163139500-73e1a7c4bd88", "photo-1470115636492-6d2b56f9146d"],
  diplomacy:     ["photo-1529107386315-e1a2ed48a620", "photo-1580130601254-05fa235abeab"],
  inventions:    ["photo-1485827404703-89b55fcc595e", "photo-1535378917042-10a22c95931a"],
  ai:            ["photo-1677442135703-1787eea5ce01", "photo-1518770660439-4636190af475"],
  space:         ["photo-1451187580459-43490279c0fa", "photo-1446776811953-b23d57bd21aa"],
  cybersecurity: ["photo-1550751827-4bd374c3f58b", "photo-1563986768494-4dee2763ff3f"],
  healthcare:    ["photo-1576091160550-2173dba999ef", "photo-1559757148-5c350d0d3c56"],
  energy:        ["photo-1509391366360-2e959784a276", "photo-1497435334941-8c899a9bd6b4"],
  economics:     ["photo-1526304640581-d334cdbbf45e", "photo-1543286386-713bdd548da4"],
  education:     ["photo-1503676260728-1c00da094a0b", "photo-1497633762265-9d179a990aa6"],
  robotics:      ["photo-1535378917042-10a22c95931a", "photo-1485827404703-89b55fcc595e"],
};

function getImages(topic) {
  const key = Object.keys(IMAGES).find((k) =>
    topic.name.toLowerCase().includes(k)
  ) || "ai";
  return IMAGES[key];
}

// ── Generate one post via Claude API ─────────────────────────────────────────
async function generatePost(topic, existingSlugs) {
  const today = new Date().toISOString().split("T")[0];
  const [heroImg, sectionImg1] = getImages(topic);

  const prompt = `Write a high-quality blog post for Anuraag Gupta's blog on the topic: "${topic.name}".

Today's date is ${today}.

Writing style:
- Analytical, clear, first-person where appropriate
- Globally minded, draws on experience across tech, business, and international affairs
- Thoughtful and nuanced — not sensationalist
- Conversational but intelligent, like a smart colleague explaining something complex

Requirements:
- Length: ~900-1100 words of actual prose
- 3-4 section headings with ##
- Include exactly 2 inline images between sections in this format:
  ![Descriptive caption](https://images.unsplash.com/photo-XXXXXXXXXX?w=1200&q=80)
  Use these reliable Unsplash IDs: ${heroImg}, ${sectionImg1}
- End with a personal reflection paragraph
- Final line exactly: *The views expressed here are my own and reflect my personal analysis of publicly available information.*

Return ONLY the complete MDX file content starting with --- frontmatter:

---
title: "Your Compelling Title Here"
date: "${today}"
excerpt: "2-3 sentence engaging summary that makes readers want to click."
tags: ${JSON.stringify(topic.tags)}
image: "https://images.unsplash.com/photo-${heroImg.replace("photo-", "")}?w=1400&q=80"
---

[your article here]`;

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
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic API error: ${JSON.stringify(data)}`);

  const content = data.content[0].text.trim();

  // Derive slug from title in frontmatter
  const titleMatch = content.match(/title:\s*"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : topic.name;
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 60);

  // Ensure uniqueness
  let finalSlug = slug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${slug}-${counter++}`;
  }

  return { slug: finalSlug, content };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const postsDir = path.join(ROOT, "content", "blog");
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  // Collect existing slugs to avoid duplicates
  const existingSlugs = new Set(
    fs.readdirSync(postsDir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(".mdx", ""))
  );

  // Shuffle and pick 5 topics
  const shuffled = [...TOPICS].sort(() => Math.random() - 0.5);
  const selectedTopics = shuffled.slice(0, 5);

  console.log("✍️   Generating 5 blog posts with Claude AI...\n");

  const newSlugs = new Set(existingSlugs);

  for (const topic of selectedTopics) {
    process.stdout.write(`   Writing  "${topic.name}"... `);
    try {
      const { slug, content } = await generatePost(topic, newSlugs);
      const filePath = path.join(postsDir, `${slug}.mdx`);
      fs.writeFileSync(filePath, content, "utf-8");
      newSlugs.add(slug);
      console.log(`✅  → content/blog/${slug}.mdx`);
    } catch (err) {
      console.log(`❌  ${err.message}`);
    }
  }

  console.log("\n🚀  Publishing new posts to Blogger...\n");
  try {
    execSync(`node "${path.join(__dirname, "publish-to-blogger.mjs")}"`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (err) {
    console.error("❌  Blogger publish failed:", err.message);
    process.exit(1);
  }

  console.log("\n🎉  All done!");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
