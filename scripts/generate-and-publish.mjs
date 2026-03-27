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

// ── Fetch trending topics Worldwide from Google Trends RSS ───────────────────
async function fetchGoogleTrends() {
  try {
    // No geo param = worldwide trending topics
    const res = await fetch("https://trends.google.com/trending/rss", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    // Extract <item> blocks and parse title + news headline for context
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const trends = items
      .slice(0, 10)
      .map((item) => {
        const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]>|<title>([^<]+)<\/title>/);
        const newsMatch  = item.match(/<ht:news_item_title><!\[CDATA\[([^\]]+)\]\]>|<ht:news_item_title>([^<]+)<\/ht:news_item_title>/);
        const name = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
        const hint = (newsMatch?.[1]  || newsMatch?.[2]  || "").trim();
        return { name, hint };
      })
      .filter((t) => t.name.length > 3 && !/^\d/.test(t.name))
      .map((t) => ({
        name: t.name + (t.hint ? ` — ${t.hint}` : ""),
        tags: ["trending", "world", "news"],
        fromTrends: true,
      }));

    if (trends.length > 0) {
      console.log(`  Fetched ${trends.length} trending topics from Google Trends (Worldwide):`);
      trends.slice(0, 2).forEach((t) => console.log("    • " + t.name));
    }
    return trends;
  } catch (err) {
    console.log(`  Google Trends fetch failed (${err.message}) — using fallback topics only`);
    return [];
  }
}

// ── Core category pool — engineering, finance, environment, AI, geopolitics, mythology ──
const CORE_CATEGORIES = {
  engineering: [
    { name: "Civil Engineering Innovations Reshaping Modern Cities",      tags: ["engineering", "infrastructure", "innovation"] },
    { name: "How Structural Engineering Is Evolving Post-Climate Crisis",  tags: ["engineering", "climate", "infrastructure"] },
    { name: "The Rise of Smart Construction and Digital Twins",           tags: ["engineering", "technology", "innovation"] },
    { name: "Bridges, Tunnels and the Engineering Feats of 2026",        tags: ["engineering", "infrastructure", "science"] },
  ],
  finance: [
    { name: "Stock Market Trends and What Investors Should Watch",        tags: ["finance", "stock market", "investing"] },
    { name: "How Global Interest Rates Are Reshaping Personal Finance",   tags: ["finance", "economics", "investing"] },
    { name: "Cryptocurrency, Gold and the Search for Safe Assets",        tags: ["finance", "crypto", "investing"] },
    { name: "The Rise of Retail Investors and Zero-Commission Trading",   tags: ["finance", "stock market", "technology"] },
  ],
  environment: [
    { name: "Climate Change in 2026: What the Data Actually Shows",       tags: ["environment", "climate", "sustainability"] },
    { name: "Oceans, Deforestation and the Crisis Nobody Talks About",    tags: ["environment", "climate", "global affairs"] },
    { name: "Renewable Energy Is Winning — Here Is the Proof",           tags: ["environment", "energy", "sustainability"] },
    { name: "Water Scarcity: The Silent Crisis Spreading Across Continents", tags: ["environment", "water", "global affairs"] },
  ],
  ai: [
    { name: "How AI Is Changing Every Industry Right Now",               tags: ["artificial intelligence", "technology", "innovation"] },
    { name: "The Battle for AI Supremacy: US, China and Europe",         tags: ["artificial intelligence", "geopolitics", "technology"] },
    { name: "Large Language Models Beyond ChatGPT: What Is Next",        tags: ["artificial intelligence", "machine learning", "technology"] },
    { name: "AI in Healthcare: Diagnosing Disease Before Symptoms Appear", tags: ["artificial intelligence", "healthcare", "technology"] },
  ],
  geopolitics: [
    { name: "Global Geopolitical Tensions That Will Define 2026",         tags: ["geopolitics", "global affairs", "conflict"] },
    { name: "Shifting Alliances: How the World Order Is Being Redrawn",  tags: ["geopolitics", "diplomacy", "international relations"] },
    { name: "The Semiconductor War Between Nations",                      tags: ["geopolitics", "technology", "economics"] },
    { name: "Trade Wars, Tariffs and the New Economic Nationalism",      tags: ["geopolitics", "economics", "trade"] },
  ],
  mythology: [
    { name: "The Mahabharata: Lessons in Leadership, Dharma and Moral Dilemmas", tags: ["hindu mythology", "history", "culture"] },
    { name: "Lord Shiva: The Many Faces of the Destroyer and Transformer", tags: ["hindu mythology", "spirituality", "culture"] },
    { name: "The Ramayana and Its Timeless Lessons on Duty and Sacrifice", tags: ["hindu mythology", "history", "philosophy"] },
    { name: "Vishnu's Ten Avatars and What They Reveal About Human Evolution", tags: ["hindu mythology", "philosophy", "culture"] },
    { name: "The Concept of Karma in Hindu Mythology and Modern Science",  tags: ["hindu mythology", "philosophy", "spirituality"] },
    { name: "Goddess Durga and the Symbolism of Feminine Power in Hinduism", tags: ["hindu mythology", "culture", "spirituality"] },
    { name: "Hindu Cosmology: How Ancient India Understood the Universe",  tags: ["hindu mythology", "science", "history"] },
    { name: "The Bhagavad Gita: Philosophy That Still Guides the World Today", tags: ["hindu mythology", "philosophy", "history"] },
    { name: "Demons and Gods in Hindu Mythology: The Eternal Battle Within", tags: ["hindu mythology", "spirituality", "culture"] },
    { name: "How Hindu Mythology Shaped Mathematics, Astronomy and Medicine", tags: ["hindu mythology", "science", "history"] },
  ],
};

// Flatten for fallback use
const TOPICS = Object.values(CORE_CATEGORIES).flat();

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
  mythology:    ["photo-1599707367072-cd6ada2bc375", "photo-1518709268805-4e9042af9f23", "photo-1564507592333-c60657eea523"],
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
  if (t.includes("mythol") || t.includes("ancient") || t.includes("legend")) return PHOTOS.mythology[Math.floor(Math.random() * 3)];
  return PHOTOS.default[Math.floor(Math.random() * 3)];
}

async function generatePost(topic, existingSlugs, today) {
  const heroPhoto = pickPhoto(topic.tags);

  const lines = [
    "You are a professional blog writer. Write a high-quality, humanized blog post on the topic below.",
    "",
    "Topic: " + topic.name,
    topic.fromTrends ? "Note: This is a TRENDING topic in India right now. Write it as a timely, news-aware piece — explain what is happening, why it is trending, and what it means." : "",
    "Date: " + today,
    "",
    "Return ONLY valid MDX with frontmatter. No extra commentary. No code fences. Start directly with ---",
    "",
    "---",
    "title: \"Your Compelling Title\"",
    "date: \"" + today + "\"",
    "excerpt: \"2-3 sentence hook that makes readers want to keep reading.\"",
    "tags: " + JSON.stringify(topic.tags),
    "image: \"https://images.unsplash.com/" + heroPhoto + "?w=1400&q=80\"",
    "---",
    "",
    "[Article body here — 950-1200 words]",
    "",
    "WRITING STYLE RULES (follow strictly):",
    "1. HUMANIZED TONE — Write the way a knowledgeable, thoughtful person would explain this to a friend over coffee.",
    "   - Use natural sentence rhythm: mix short punchy lines with longer explanations.",
    "   - Avoid AI-sounding phrases like 'It is worth noting', 'In conclusion', 'Delve into', 'It is important to', 'Shed light on', 'Navigate', 'Crucial', 'In the realm of'.",
    "   - Use everyday words. If a simpler word works, use it.",
    "   - Vary paragraph length — some 1 sentence, some 3-4 sentences.",
    "",
    "2. GENERIC PERSPECTIVE — Write as a knowledgeable observer, NOT personal narrative.",
    "   - Do NOT use: 'I encountered', 'I personally', 'In my experience', 'As I was reading', 'I remember when'.",
    "   - Write in third person or general 'we/you' where it fits naturally.",
    "   - Focus on the topic, trends, data, and expert views — not personal anecdotes.",
    "",
    "3. FORMATTING like popular bloggers:",
    "   - Every sentence starts with a capital letter.",
    "   - Use **bold text** for key terms, important stats, and standout phrases (2-4 times per section).",
    "   - Use 3-4 section headings with ## — make them punchy and curiosity-driven.",
    "   - Use short bullet lists (3-5 items) where it helps clarity.",
    "   - Add a blank line between paragraphs.",
    "",
    "4. IMAGES — Add 2-3 inline section images with descriptive, factual captions:",
    "   Format: ![Clear descriptive caption](https://images.unsplash.com/photo-XXXXXXXXXX?w=1200&q=80)",
    "   - Captions must describe what is in the image, not be vague.",
    "   - Use ONLY these verified, safe, non-controversial Unsplash photo IDs:",
    "   tech/circuits: photo-1518770660439-4636190af475",
    "   global/maps: photo-1504711434969-e33886168f5c",
    "   business meeting: photo-1460925895917-afdab827c52f",
    "   AI visualization: photo-1677442135703-1787eea5ce01",
    "   nature/green: photo-1569163139500-73e1a7c4bd88",
    "   space/earth: photo-1446776811953-b23d57bd21aa",
    "   healthcare/lab: photo-1576091160550-2173dba999ef",
    "   solar energy: photo-1509391366360-2e959784a276",
    "   finance charts: photo-1611974789855-9c2a0a7236a3",
    "   robotics arm: photo-1535378917042-10a22c95931a",
    "   city infrastructure: photo-1581094794329-c8112a89af12",
    "   Hero image MUST be exactly: https://images.unsplash.com/" + heroPhoto + "?w=1400&q=80",
    "",
    "5. NO PLAGIARISM — All content must be 100% original. Do not copy or closely paraphrase any published article.",
    "   Use publicly known facts and trends but express them in completely fresh language.",
    "",
    "6. ENDING — Close with a forward-looking thought about where this topic is headed. Keep it grounded, not dramatic.",
    "   Final line must be (in italic): *All views and analysis presented here are based on publicly available information.*",
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

  console.log("\n Daily Blog Generator — " + today);
  console.log("=".repeat(52));

  // ── Post 1 & 2: Worldwide Google Trends ─────────────────────────────────────
  const trendingTopics = await fetchGoogleTrends();
  const trendSlots = trendingTopics.slice(0, 2);

  // ── Posts 3–5: One from each of 3 randomly picked core categories ────────────
  const categoryKeys = Object.keys(CORE_CATEGORIES).sort(() => Math.random() - 0.5).slice(0, 3);
  const coreSlots = categoryKeys.map((cat) => {
    const pool = CORE_CATEGORIES[cat];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  // If Trends failed, fill remaining slots from core pool too
  const trendFill = trendSlots.length < 2
    ? Object.values(CORE_CATEGORIES).flat().sort(() => Math.random() - 0.5).slice(0, 2 - trendSlots.length)
    : [];

  const selectedTopics = [...trendSlots, ...trendFill, ...coreSlots];
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
