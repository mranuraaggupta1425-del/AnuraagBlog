/**
 * publish-to-blogger.js
 * Automates publishing blog posts from posts.json to Blogger.com
 * Uses Blogger API v3 with OAuth2 authentication
 */

const fs   = require('fs');
const path = require('path');
const { authenticate } = require('./auth');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  BLOG_ID      : process.env.BLOGGER_BLOG_ID || '5180885703047178594',
  POSTS_FILE   : path.resolve(__dirname, '../data/posts.json'),
  TRACKER_FILE : path.resolve(__dirname, 'published-tracker.json'),
  DRY_RUN      : process.argv.includes('--dry-run'),
  FORCE_ALL    : process.argv.includes('--force-all'),
  POST_ID      : getArgValue('--post'),   // publish a single post by id
  DELAY_MS     : 1500,                    // delay between API calls (rate limit)
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadTracker() {
  if (!fs.existsSync(CONFIG.TRACKER_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG.TRACKER_FILE, 'utf-8'));
}

function saveTracker(tracker) {
  fs.writeFileSync(CONFIG.TRACKER_FILE, JSON.stringify(tracker, null, 2));
}

function loadPosts() {
  if (!fs.existsSync(CONFIG.POSTS_FILE)) {
    console.error(`❌ posts.json not found at: ${CONFIG.POSTS_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG.POSTS_FILE, 'utf-8'));
}

/** Convert posts.json date "2025-03-15" → RFC 3339 for Blogger API */
function toRFC3339(dateStr) {
  return new Date(dateStr + 'T10:00:00Z').toISOString();
}

/** Build labels array from post tags + category */
function buildLabels(post) {
  const labels = new Set(post.tags || []);
  if (post.category) labels.add(post.category);
  return [...labels];
}

/** Build full HTML body for Blogger post */
function buildBody(post) {
  return `
<div class="post-meta" style="color:#666;font-size:0.9em;margin-bottom:1.5em;">
  <span>By <strong>${post.author || 'Unknown'}</strong></span>
  &nbsp;·&nbsp;
  <span>${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span>
  &nbsp;·&nbsp;
  <span>${post.category || ''}</span>
</div>

<p class="post-summary" style="font-size:1.1em;color:#444;font-style:italic;border-left:4px solid #2563eb;padding-left:1em;margin-bottom:2em;">
  ${post.summary}
</p>

${post.content}

<div class="post-tags" style="margin-top:2em;padding-top:1em;border-top:1px solid #eee;">
  ${(post.tags || []).map(t => `<span style="background:#f0f4ff;color:#2563eb;padding:0.2em 0.6em;border-radius:999px;font-size:0.85em;margin-right:0.4em;">${t}</span>`).join('')}
</div>
`.trim();
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Create a new post on Blogger
 * Blogger API docs: https://developers.google.com/blogger/docs/3.0/reference/posts/insert
 */
async function createPost(authClient, post) {
  const { google } = require('googleapis');
  const blogger    = google.blogger({ version: 'v3', auth: authClient });

  const resource = {
    title    : post.title,
    content  : buildBody(post),
    labels   : buildLabels(post),
    published: toRFC3339(post.date),
  };

  const response = await blogger.posts.insert({
    blogId    : CONFIG.BLOG_ID,
    isDraft   : false,
    resource,
  });

  return response.data;
}

/**
 * Update an existing post on Blogger
 */
async function updatePost(authClient, bloggerPostId, post) {
  const { google } = require('googleapis');
  const blogger    = google.blogger({ version: 'v3', auth: authClient });

  const resource = {
    title  : post.title,
    content: buildBody(post),
    labels : buildLabels(post),
  };

  const response = await blogger.posts.update({
    blogId  : CONFIG.BLOG_ID,
    postId  : bloggerPostId,
    resource,
  });

  return response.data;
}

/**
 * List all posts on the blog (for verification)
 */
async function listBloggerPosts(authClient) {
  const { google } = require('googleapis');
  const blogger    = google.blogger({ version: 'v3', auth: authClient });

  const response = await blogger.posts.list({
    blogId    : CONFIG.BLOG_ID,
    maxResults: 50,
    status    : ['live', 'draft'],
  });

  return response.data.items || [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Blogger Automation Script');
  console.log('================================');

  if (CONFIG.DRY_RUN) console.log('🔍 DRY RUN mode — no posts will be published\n');
  if (!CONFIG.DRY_RUN && CONFIG.BLOG_ID === 'YOUR_BLOG_ID_HERE') {
    console.error('❌ Error: Set your BLOGGER_BLOG_ID in the environment or CONFIG.');
    console.error('   Run: $env:BLOGGER_BLOG_ID="1234567890123456789" (Windows PowerShell)');
    console.error('   Or:  export BLOGGER_BLOG_ID="1234567890123456789" (Mac/Linux)\n');
    process.exit(1);
  }

  // 1. Load local data
  const allPosts = loadPosts();
  const tracker  = loadTracker();

  // 2. Filter which posts to process
  let postsToProcess = allPosts;
  if (CONFIG.POST_ID) {
    postsToProcess = allPosts.filter(p => p.id === CONFIG.POST_ID);
    if (!postsToProcess.length) {
      console.error(`❌ Post with id "${CONFIG.POST_ID}" not found in posts.json`);
      process.exit(1);
    }
  } else if (!CONFIG.FORCE_ALL) {
    postsToProcess = allPosts.filter(p => !tracker[p.id]);
    if (!postsToProcess.length) {
      console.log('✅ All posts have already been published. Use --force-all to re-publish.\n');
      return;
    }
  }

  console.log(`📄 Posts to publish: ${postsToProcess.length}`);
  postsToProcess.forEach(p => console.log(`   • [${p.date}] ${p.title}`));
  console.log('');

  if (CONFIG.DRY_RUN) {
    console.log('🔍 Dry run complete. Remove --dry-run to publish for real.\n');
    return;
  }

  // 3. Authenticate with Google OAuth2
  console.log('🔐 Authenticating with Google...');
  const authClient = await authenticate();
  console.log('✅ Authenticated!\n');

  // 4. Publish each post
  let published = 0;
  let updated   = 0;
  let failed    = 0;

  for (const post of postsToProcess) {
    try {
      const existingId = tracker[post.id]?.bloggerId;

      if (existingId && CONFIG.FORCE_ALL) {
        // Update existing post
        console.log(`🔄 Updating: "${post.title}"...`);
        const result = await updatePost(authClient, existingId, post);
        tracker[post.id] = { bloggerId: result.id, url: result.url, publishedAt: new Date().toISOString() };
        saveTracker(tracker);
        console.log(`   ✅ Updated → ${result.url}`);
        updated++;
      } else {
        // Create new post
        console.log(`📝 Publishing: "${post.title}"...`);
        const result = await createPost(authClient, post);
        tracker[post.id] = { bloggerId: result.id, url: result.url, publishedAt: new Date().toISOString() };
        saveTracker(tracker);
        console.log(`   ✅ Published → ${result.url}`);
        published++;
      }

      await sleep(CONFIG.DELAY_MS); // respect rate limits

    } catch (err) {
      console.error(`   ❌ Failed: "${post.title}" → ${err.message}`);
      failed++;
    }
  }

  // 5. Summary
  console.log('\n================================');
  console.log('📊 Summary:');
  if (published) console.log(`   ✅ Published : ${published} post(s)`);
  if (updated)   console.log(`   🔄 Updated   : ${updated} post(s)`);
  if (failed)    console.log(`   ❌ Failed    : ${failed} post(s)`);
  console.log('================================\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.message.includes('invalid_grant')) {
    console.error('   → Your OAuth token has expired. Delete "token.json" and re-run.');
  }
  process.exit(1);
});
