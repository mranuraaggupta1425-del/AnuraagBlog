/**
 * list-posts.js
 * Lists all posts currently on your Blogger blog
 * Useful for verifying what's been published
 */

const { authenticate } = require('./auth');
const { google }       = require('googleapis');
const fs               = require('fs');
const path             = require('path');

const BLOG_ID      = process.env.BLOGGER_BLOG_ID || '5180885703047178594';
const TRACKER_FILE = path.resolve(__dirname, 'published-tracker.json');

async function main() {
  console.log('\n📋 Listing Blogger Posts');
  console.log('=========================\n');

  if (BLOG_ID === 'YOUR_BLOG_ID_HERE') {
    console.error('❌ Set your BLOGGER_BLOG_ID first!\n');
    process.exit(1);
  }

  const authClient = await authenticate();
  const blogger    = google.blogger({ version: 'v3', auth: authClient });

  const response = await blogger.posts.list({
    blogId    : BLOG_ID,
    maxResults: 50,
    status    : ['live', 'draft'],
  });

  const posts = response.data.items || [];

  if (!posts.length) {
    console.log('📭 No posts found on your blog.\n');
    return;
  }

  // Load local tracker
  const tracker = fs.existsSync(TRACKER_FILE)
    ? JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'))
    : {};

  const trackedIds = new Set(Object.values(tracker).map(t => t.bloggerId));

  console.log(`Found ${posts.length} post(s) on Blogger:\n`);
  posts.forEach((post, i) => {
    const synced = trackedIds.has(post.id) ? '🔗 synced' : '🆕 not in local tracker';
    console.log(`${String(i + 1).padStart(2)}. [${post.status}] ${post.title}`);
    console.log(`    Published : ${post.published || '(draft)'}`);
    console.log(`    URL       : ${post.url}`);
    console.log(`    Blogger ID: ${post.id}  ${synced}`);
    console.log('');
  });

  console.log('=========================\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
