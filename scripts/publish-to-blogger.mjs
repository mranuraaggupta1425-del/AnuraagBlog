/**
 * publish-to-blogger.mjs
 * Reads all MDX posts from content/blog/, converts to styled HTML,
 * and publishes NEW posts or updates EXISTING ones on Blogger.
 *
 * Usage:
 *   node scripts/publish-to-blogger.mjs          → publish new, skip existing
 *   node scripts/publish-to-blogger.mjs --update → publish new + update existing
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UPDATE_MODE = process.argv.includes("--update");

// ── Config from .env.local ──────────────────────────────────────────────────
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

const BLOG_ID        = process.env.BLOGGER_BLOG_ID;
const CLIENT_ID      = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET  = process.env.BLOGGER_CLIENT_SECRET;
const REFRESH_TOKEN  = process.env.BLOGGER_REFRESH_TOKEN;
const TRACKER_FILE   = path.join(ROOT, "scripts", "published-posts.json");

if (!BLOG_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("❌  Missing credentials in .env.local");
  process.exit(1);
}

// ── Tracker ─────────────────────────────────────────────────────────────────
function loadTracker() {
  if (!fs.existsSync(TRACKER_FILE)) return {};
  return JSON.parse(fs.readFileSync(TRACKER_FILE, "utf-8"));
}
function saveTracker(data) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2));
}

// ── OAuth ────────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Convert markdown to raw HTML ─────────────────────────────────────────────
async function mdToHtml(markdown) {
  const result = await remark().use(remarkHtml, { sanitize: false }).process(markdown);
  return String(result);
}

// ── Wrap HTML in beautiful Blogger-ready styled template ─────────────────────
function wrapInBloggerTemplate(post, rawHtml) {
  // Style images in the content
  const styledHtml = rawHtml
    .replace(
      /<img\s+src="([^"]+)"\s+alt="([^"]*)"\s*\/?>/g,
      `<div style="margin:40px 0;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.15);">
        <img src="$1" alt="$2" style="width:100%;height:auto;display:block;border-radius:16px;" />
        <p style="margin:8px 0 0;font-size:13px;color:#888;text-align:center;font-style:italic;padding:8px 16px;">$2</p>
      </div>`
    )
    .replace(/<h2>/g, '<h2 style="font-size:28px;font-weight:700;margin:48px 0 16px;color:#1a1a1a;border-left:4px solid #8b5cf6;padding-left:16px;">')
    .replace(/<h3>/g, '<h3 style="font-size:21px;font-weight:600;margin:32px 0 12px;color:#2d2d2d;">')
    .replace(/<p>/g, '<p style="font-size:17px;line-height:1.8;color:#374151;margin:0 0 20px;">')
    .replace(/<ul>/g, '<ul style="margin:16px 0 24px;padding-left:28px;">')
    .replace(/<li>/g, '<li style="font-size:17px;line-height:1.8;color:#374151;margin-bottom:8px;">')
    .replace(/<strong>/g, '<strong style="color:#1a1a1a;font-weight:700;">')
    .replace(/<hr\s*\/?>/g, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:40px 0;" />');

  const tagsHtml = post.tags && post.tags.length > 0
    ? post.tags.map(t =>
        `<span style="display:inline-block;background:#f3f0ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:999px;padding:4px 14px;font-size:13px;font-weight:500;margin:0 4px 4px 0;text-transform:capitalize;">${t}</span>`
      ).join("")
    : "";

  const heroImage = post.image
    ? `<div style="margin:-8px -8px 40px;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.18);">
        <img src="${post.image}" alt="${post.title}" style="width:100%;height:400px;object-fit:cover;display:block;" />
      </div>`
    : "";

  return `
<div style="font-family:'Georgia',serif;max-width:780px;margin:0 auto;padding:8px;">

  ${heroImage}

  <div style="margin-bottom:24px;">
    ${tagsHtml}
  </div>

  <p style="font-size:13px;color:#9ca3af;margin:0 0 32px;letter-spacing:0.05em;">
    By <strong style="color:#6b7280;">Anuraag Gupta</strong> &nbsp;·&nbsp;
    ${new Date(post.date).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}
  </p>

  <div style="font-size:17px;line-height:1.8;color:#374151;">
    ${styledHtml}
  </div>

  <div style="margin-top:56px;padding:32px;background:linear-gradient(135deg,#f5f3ff,#eff6ff);border-radius:16px;border:1px solid #e9d5ff;">
    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#4c1d95;">💬 Share Your Thoughts</p>
    <p style="margin:0;font-size:15px;color:#6d28d9;line-height:1.6;">
      I'd genuinely love to hear what you think about this piece. Drop a comment below or reach out directly at
      <a href="https://anuraaggupta1425.blogspot.com" style="color:#7c3aed;font-weight:600;">anuraaggupta1425.blogspot.com</a>
    </p>
  </div>

</div>`;
}

// ── Publish a NEW post ────────────────────────────────────────────────────────
async function publishPost(accessToken, post, htmlContent) {
  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "blogger#post",
        title: post.title,
        content: htmlContent,
        ...(post.tags?.length && { labels: post.tags }),
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Blogger API error: ${JSON.stringify(data)}`);
  return data;
}

// ── Update an EXISTING post ───────────────────────────────────────────────────
async function updatePost(accessToken, postId, post, htmlContent) {
  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/${postId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "blogger#post",
        id: postId,
        title: post.title,
        content: htmlContent,
        ...(post.tags?.length && { labels: post.tags }),
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Update error: ${JSON.stringify(data)}`);
  return data;
}

// ── Read all MDX posts ────────────────────────────────────────────────────────
function readAllPosts() {
  const postsDir = path.join(ROOT, "content", "blog");
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
      const { data, content } = matter(raw);
      return { slug, title: data.title || slug, date: data.date || "", excerpt: data.excerpt || "", tags: data.tags || [], image: data.image || "", content };
    })
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔗  Connecting to Blogger${UPDATE_MODE ? " (update mode)" : ""}...`);
  const accessToken = await getAccessToken();
  console.log("✅  Authenticated\n");

  const tracker = loadTracker();
  const posts   = readAllPosts();

  for (const post of posts) {
    const rawHtml     = await mdToHtml(post.content);
    const styledHtml  = wrapInBloggerTemplate(post, rawHtml);

    if (tracker[post.slug]) {
      if (!UPDATE_MODE) {
        console.log(`⏭️   Skipping "${post.title}" (already published)`);
        continue;
      }
      process.stdout.write(`   Updating  "${post.title}"... `);
      try {
        const result = await updatePost(accessToken, tracker[post.slug].bloggerPostId, post, styledHtml);
        tracker[post.slug].updatedAt = new Date().toISOString();
        tracker[post.slug].bloggerUrl = result.url;
        saveTracker(tracker);
        console.log(`✅  → ${result.url}`);
      } catch (err) {
        console.log(`❌  ${err.message}`);
      }
    } else {
      process.stdout.write(`   Publishing "${post.title}"... `);
      try {
        const result = await publishPost(accessToken, post, styledHtml);
        tracker[post.slug] = { bloggerPostId: result.id, bloggerUrl: result.url, publishedAt: new Date().toISOString() };
        saveTracker(tracker);
        console.log(`✅  → ${result.url}`);
      } catch (err) {
        console.log(`❌  ${err.message}`);
      }
    }
  }

  console.log("\n🎉  Done!");
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
