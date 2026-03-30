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

// ── Fetch topic-matched photos from Pexels search page (no API key needed) ──
async function fetchPexelsPhotos(searchQuery, count = 3) {
  try {
    const query = encodeURIComponent(searchQuery);
    const res = await fetch(`https://www.pexels.com/search/${query}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
    });
    const html = await res.text();
    // Extract photo IDs from Pexels page HTML
    const matches = [...html.matchAll(/pexels\.com\/photos\/(\d+)\//g)];
    const ids = [...new Set(matches.map((m) => m[1]))].slice(0, count);
    return ids.map((id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`);
  } catch (err) {
    console.log(`  Pexels fetch failed (${err.message}) — using fallback photos`);
    return [];
  }
}

// ── Generate Pexels search query from topic using Gemini (free) ──────────────
async function getPexelsQuery(topicName) {
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return topicName;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `For a blog post about "${topicName}", give me 3 short, specific Pexels image search queries (2-4 words each) that would return perfectly matching photos. Return ONLY a JSON array like ["query 1","query 2","query 3"]. No explanation.` }] }],
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [topicName];
  }
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

// ── Core category pool — engineering, finance, environment, AI, geopolitics, sports ──
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
  sports: [
    { name: "How Football Clubs Are Using Data Analytics to Win",         tags: ["sports", "football", "technology"], isSports: true },
    { name: "The Business of Cricket: IPL, Broadcasting Rights and the Money Behind the Game", tags: ["sports", "cricket", "business"], isSports: true },
    { name: "Formula 1 in 2026: New Rules, New Teams and the Fight for Dominance", tags: ["sports", "formula 1", "technology"], isSports: true },
    { name: "The Rise of Women's Sport: Viewership, Investment and What Changed", tags: ["sports", "football", "culture"], isSports: true },
    { name: "How Olympic Athletes Train: The Science Behind Peak Performance", tags: ["sports", "fitness", "science"], isSports: true },
    { name: "Basketball's Global Expansion: How the NBA Is Growing Beyond America", tags: ["sports", "basketball", "global affairs"], isSports: true },
    { name: "Tennis at the Crossroads: The Next Generation Taking Over Grand Slams", tags: ["sports", "tennis", "culture"], isSports: true },
    { name: "The Mental Game: Why Sports Psychology Is Now as Important as Physical Training", tags: ["sports", "fitness", "science"], isSports: true },
    { name: "Esports vs Traditional Sports: The Battle for the Next Generation of Fans", tags: ["sports", "esports", "technology"], isSports: true },
    { name: "The Economics of Athlete Transfers: Where the Money Really Goes", tags: ["sports", "football", "finance"], isSports: true },
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
  sports:       ["photo-1461896836934-ffe607ba8211", "photo-1517649763962-0c623066013b", "photo-1574629810360-7efbbe195018"],
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
  if (t.includes("sport") || t.includes("football") || t.includes("cricket") || t.includes("tennis") || t.includes("basketball") || t.includes("fitness") || t.includes("esport")) return PHOTOS.sports[Math.floor(Math.random() * 3)];
  return PHOTOS.default[Math.floor(Math.random() * 3)];
}

async function generatePost(topic, existingSlugs, today) {
  // ── Fetch topic-matched Pexels photos ──────────────────────────────────────
  const queries = await getPexelsQuery(topic.name);
  const pexelsPhotos = [];
  for (const q of queries.slice(0, 3)) {
    const photos = await fetchPexelsPhotos(q, 2);
    pexelsPhotos.push(...photos);
    if (pexelsPhotos.length >= 3) break;
  }
  // Fallback to verified Unsplash if Pexels fails
  const heroPhoto = pexelsPhotos[0] || `https://images.unsplash.com/${pickPhoto(topic.tags)}?w=1400&q=80`;
  const sectionPhoto1 = pexelsPhotos[1] || `https://images.unsplash.com/${pickPhoto(topic.tags)}?w=1200&q=80`;
  const sectionPhoto2 = pexelsPhotos[2] || `https://images.unsplash.com/${pickPhoto(topic.tags)}?w=1200&q=80`;

  const lines = [
    "You are a professional blog writer. Write a high-quality, humanized blog post on the topic below.",
    "",
    "Topic: " + topic.name,
    topic.fromTrends ? "Note: This is a TRENDING topic right now globally. Write it as a timely, news-aware piece — explain what is happening, why it is trending, and what it means." : "",
    topic.isSports ? "Note: This is a SPORTS topic. Write it with energy and passion — cover the game, the business angle, the human stories, statistics, and what it means for fans and the broader sports ecosystem." : "",
    "Date: " + today,
    "",
    "Return ONLY valid MDX with frontmatter. No extra commentary. No code fences. Start directly with ---",
    "",
    "---",
    "title: \"Your Compelling Title\"",
    "date: \"" + today + "\"",
    "excerpt: \"2-3 sentence hook that makes readers want to keep reading.\"",
    "tags: " + JSON.stringify(topic.tags),
    "image: \"" + heroPhoto + "\"",
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
    "4. IMAGES — Use EXACTLY these 2 pre-fetched images in the article body (already matched to the topic):",
    "   Image 1: " + sectionPhoto1,
    "   Image 2: " + sectionPhoto2,
    "   Format: ![Descriptive caption matching the image content](IMAGE_URL)",
    "   - Place Image 1 after the first or second section heading.",
    "   - Place Image 2 after the third section heading.",
    "   - Write captions that describe what is actually shown in a photo relevant to the topic.",
    "",
    "5. NO PLAGIARISM — All content must be 100% original. Do not copy or closely paraphrase any published article.",
    "   Use publicly known facts and trends but express them in completely fresh language.",
    "",
    "6. ENDING — Close with a forward-looking thought about where this topic is headed. Keep it grounded, not dramatic.",
    "   Final line must be (in italic): *All views and analysis presented here are based on publicly available information.*",
    "",
    ...(topic.isSports ? [
      "ADDITIONAL RULES FOR THIS POST (MANDATORY — Sports topic):",
      "A. Write with energy, enthusiasm and genuine passion for the sport.",
      "B. Cover at least 2 of these angles: performance/tactics, business/money, fan culture, athlete stories, global impact.",
      "C. Include real statistics, records or facts where relevant to make the post credible.",
      "D. Keep the tone exciting but grounded — not over-hyped.",
    ] : []),
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
