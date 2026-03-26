/**
 * post.js — Single post page logic for Inkwell Blog
 *
 * Responsibilities:
 *  - Read ?id= from the URL query string
 *  - Fetch the matching post from data/posts.json
 *  - Render post header, body, tags, and share buttons
 *  - Render "More Posts" grid (other posts, up to 3)
 *  - Update <title> and <meta description>
 *  - Breadcrumb, reading progress bar
 *  - Mobile nav toggle
 *  - Set footer year
 */

/* ─── Data Layer ────────────────────────────────────────────── */

/**
 * Fetches all posts.
 * @returns {Promise<Object[]>}
 */
async function fetchPosts() {
  const response = await fetch('data/posts.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Returns the post whose id matches the given string, or null.
 * @param {Object[]} posts
 * @param {string}   id
 * @returns {Object|null}
 */
function findPost(posts, id) {
  return posts.find(p => p.id === id) ?? null;
}

/* ─── Utility helpers ───────────────────────────────────────── */

/** @param {string} dateStr */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

/** @param {string} html */
function readingTime(html) {
  const text      = html.replace(/<[^>]*>/g, ' ');
  const wordCount = text.trim().split(/\s+/).length;
  const minutes   = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/** @param {string} id */
function postUrl(id) {
  return `post.html#${encodeURIComponent(id)}`;
}

/* ─── Render helpers ────────────────────────────────────────── */

/**
 * Sets the document <title> and meta description.
 * @param {Object} post
 */
function updateMeta(post) {
  document.getElementById('pageTitle').textContent  = `${post.title} — Inkwell`;
  document.title = `${post.title} — Inkwell`;
  document.getElementById('metaDescription').content = post.summary;
}

/**
 * Renders the post header section.
 * @param {Object} post
 */
function renderHeader(post) {
  const header = document.getElementById('postHeader');

  const tag = document.createElement('span');
  tag.className = 'category-tag';
  tag.dataset.category = post.category;
  tag.textContent = post.category;

  const h1 = document.createElement('h1');
  h1.textContent = post.title;

  const meta = document.createElement('div');
  meta.className = 'post-meta';
  meta.innerHTML = `
    <span class="post-meta-author">${post.author}</span>
    <span class="post-meta-divider" aria-hidden="true">·</span>
    <time datetime="${post.date}">${formatDate(post.date)}</time>
    <span class="post-meta-divider" aria-hidden="true">·</span>
    <span>${readingTime(post.content)}</span>
  `;

  header.innerHTML = '';
  header.appendChild(tag);
  header.appendChild(h1);
  header.appendChild(meta);
}

/**
 * Renders the post body content (trusted HTML from our own JSON).
 * @param {Object} post
 */
function renderBody(post) {
  const body = document.getElementById('postBody');
  body.innerHTML = ''; // clear skeleton

  const prose = document.createElement('div');
  prose.innerHTML = post.content;
  body.appendChild(prose);
}

/**
 * Renders the post footer: tags + share buttons.
 * @param {Object} post
 */
function renderFooter(post) {
  const footer = document.getElementById('postFooter');
  const tags   = document.getElementById('postTags');
  const share  = document.getElementById('shareButtons');

  // Tags
  const label = document.createElement('span');
  label.className   = 'tag-pill';
  label.textContent = '🏷 Tags:';
  label.style.fontWeight = '600';
  tags.appendChild(label);

  post.tags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className   = 'tag-pill';
    pill.textContent = tag;
    tags.appendChild(pill);
  });

  // Share buttons (using Web Share API where available, falling back to copy)
  const shareData = {
    title: post.title,
    text:  post.summary,
    url:   window.location.href,
  };

  if (navigator.share) {
    const nativeBtn  = document.createElement('button');
    nativeBtn.className = 'share-btn';
    nativeBtn.textContent = '↑ Share';
    nativeBtn.addEventListener('click', async () => {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or API unavailable — silently ignore
      }
    });
    share.appendChild(nativeBtn);
  }

  const copyBtn = document.createElement('button');
  copyBtn.className   = 'share-btn';
  copyBtn.textContent = '🔗 Copy link';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '🔗 Copy link'; }, 2000);
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
  });
  share.appendChild(copyBtn);

  footer.hidden = false;
}

/**
 * Updates the breadcrumb with the current post title.
 * @param {Object} post
 */
function renderBreadcrumb(post) {
  const crumb = document.getElementById('breadcrumbPost');
  crumb.textContent = post.title;
}

/**
 * Renders the "More Posts" section with up to 3 other posts.
 * @param {Object[]} allPosts
 * @param {string}   currentId
 */
function renderMorePosts(allPosts, currentId) {
  const section = document.getElementById('morePosts');
  const grid    = document.getElementById('morePostsGrid');

  const others = allPosts
    .filter(p => p.id !== currentId)
    .slice(0, 3);

  if (others.length === 0) return;

  others.forEach(post => {
    const article = document.createElement('article');
    article.className = 'post-card';

    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.dataset.category = post.category;
    tag.textContent = post.category;

    article.innerHTML = `
      <div class="post-card-meta">
        ${tag.outerHTML}
        <time class="post-card-date" datetime="${post.date}">${formatDate(post.date)}</time>
      </div>
      <h3><a href="${postUrl(post.id)}">${post.title}</a></h3>
      <p>${post.summary}</p>
      <div class="post-card-footer">
        <a href="${postUrl(post.id)}" class="read-more" aria-label="Read ${post.title}">
          Read more <span class="read-more-arrow" aria-hidden="true">→</span>
        </a>
        <span class="read-time">${readingTime(post.content)}</span>
      </div>
    `;

    grid.appendChild(article);
  });

  section.hidden = false;
}

/* ─── Reading progress bar ──────────────────────────────────── */

function initProgressBar() {
  const fill = document.getElementById('progressFill');
  const bar  = document.getElementById('progressBar');

  function update() {
    const article   = document.getElementById('postArticle');
    const articleTop    = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const scrolled  = window.scrollY - articleTop;
    const total     = articleHeight - window.innerHeight;
    const progress  = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;

    fill.style.width = `${progress}%`;
    bar.setAttribute('aria-valuenow', Math.round(progress));
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ─── Mobile nav ────────────────────────────────────────────── */

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ─── Error state ───────────────────────────────────────────── */

function showError() {
  document.getElementById('postArticle').classList.add('hidden');
  document.getElementById('errorPage').classList.remove('hidden');
  document.title = 'Post Not Found — Inkwell';
}

/* ─── Initialise ────────────────────────────────────────────── */

/** Sets the current year in the footer copyright. */
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

async function init() {
  // Read post ID from URL hash (e.g. post.html#my-post-id)
  const id = decodeURIComponent(window.location.hash.slice(1)) || null;

  if (!id) {
    showError();
    initMobileNav();
    setFooterYear();
    return;
  }

  try {
    const posts = await fetchPosts();
    const post  = findPost(posts, id);

    if (!post) {
      showError();
      initMobileNav();
      setFooterYear();
      return;
    }

    // Mark article as loaded
    document.getElementById('postArticle').removeAttribute('aria-busy');

    updateMeta(post);
    renderBreadcrumb(post);
    renderHeader(post);
    renderBody(post);
    renderFooter(post);
    renderMorePosts(posts, id);

    initProgressBar();
  } catch (err) {
    console.error('Failed to load post:', err);
    showError();
  }

  initMobileNav();
  setFooterYear();
}

init();
