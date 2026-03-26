/**
 * main.js — Home page logic for Inkwell Blog
 *
 * Responsibilities:
 *  - Fetch posts from data/posts.json
 *  - Render featured post (most recent)
 *  - Render post grid with category filtering
 *  - Build dynamic category filter buttons
 *  - Handle mobile nav toggle
 *  - Newsletter form validation + mock submission
 *  - Set footer year
 */

/* ─── Data Layer ────────────────────────────────────────────── */

/**
 * Fetches all posts from the JSON data source.
 * Returns an array of post objects, sorted newest-first.
 * @returns {Promise<Object[]>}
 */
async function fetchPosts() {
  const response = await fetch('data/posts.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const posts = await response.json();
  // Sort descending by date
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ─── Utility helpers ───────────────────────────────────────── */

/**
 * Formats a date string into a human-readable format.
 * @param {string} dateStr — ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

/**
 * Estimates reading time from an HTML content string.
 * Assumes ~200 words per minute.
 * @param {string} html
 * @returns {string}
 */
function readingTime(html) {
  const text      = html.replace(/<[^>]*>/g, ' ');
  const wordCount = text.trim().split(/\s+/).length;
  const minutes   = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/**
 * Returns the URL for a single post page.
 * @param {string} id
 * @returns {string}
 */
function postUrl(id) {
  return `post.html#${encodeURIComponent(id)}`;
}

/* ─── Render helpers ────────────────────────────────────────── */

/**
 * Builds and returns a category tag element.
 * @param {string} category
 * @returns {HTMLElement}
 */
function createCategoryTag(category) {
  const tag = document.createElement('span');
  tag.className = 'category-tag';
  tag.dataset.category = category;
  tag.textContent = category;
  return tag;
}

/**
 * Renders the featured (most recent) post card.
 * @param {Object} post
 */
function renderFeatured(post) {
  const el = document.getElementById('featuredPost');

  el.innerHTML = '';
  el.removeAttribute('aria-busy');

  const content = document.createElement('div');
  content.className = 'featured-content';

  content.innerHTML = `
    <div></div>
    <h3><a href="${postUrl(post.id)}">${post.title}</a></h3>
    <p class="featured-meta">
      <time datetime="${post.date}">${formatDate(post.date)}</time>
      &nbsp;·&nbsp; By ${post.author}
      &nbsp;·&nbsp; ${readingTime(post.content)}
    </p>
    <p>${post.summary}</p>
    <a href="${postUrl(post.id)}" class="btn btn-ghost">Read Article →</a>
  `;

  // Insert category tag into the placeholder div
  content.querySelector('div').replaceWith(createCategoryTag(post.category));

  const badge = document.createElement('div');
  badge.className = 'featured-badge';
  badge.innerHTML = `
    <span class="featured-badge-icon" aria-hidden="true">📝</span>
    <span class="featured-badge-label">Latest</span>
  `;

  el.appendChild(content);
  el.appendChild(badge);
}

/**
 * Creates and returns a post card element.
 * @param {Object} post
 * @returns {HTMLElement}
 */
function createPostCard(post) {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.category = post.category;

  article.innerHTML = `
    <div class="post-card-meta">
      ${createCategoryTag(post.category).outerHTML}
      <time class="post-card-date" datetime="${post.date}">${formatDate(post.date)}</time>
      <span class="post-card-author">${post.author}</span>
    </div>
    <h3><a href="${postUrl(post.id)}">${post.title}</a></h3>
    <p>${post.summary}</p>
    <div class="post-card-footer">
      <a href="${postUrl(post.id)}" class="read-more" aria-label="Read ${post.title}">
        Read more <span class="read-more-arrow" aria-hidden="true">→</span>
      </a>
      <span class="read-time" aria-label="${readingTime(post.content)}">${readingTime(post.content)}</span>
    </div>
  `;

  return article;
}

/**
 * Renders the post grid, optionally filtered by category.
 * @param {Object[]} posts
 * @param {string}   category — 'all' or a specific category name
 */
function renderGrid(posts, category = 'all') {
  const grid       = document.getElementById('postsGrid');
  const emptyState = document.getElementById('emptyState');

  const filtered = category === 'all'
    ? posts
    : posts.filter(p => p.category === category);

  grid.innerHTML = '';
  grid.removeAttribute('aria-busy');

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  filtered.forEach(post => grid.appendChild(createPostCard(post)));
}

/**
 * Builds the category filter buttons from post data.
 * @param {Object[]} posts
 */
function buildCategoryFilters(posts) {
  const categories = [...new Set(posts.map(p => p.category))];
  const bar        = document.querySelector('.filter-bar');

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    bar.appendChild(btn);
  });
}

/* ─── Event handlers ────────────────────────────────────────── */

/**
 * Wires up the category filter buttons.
 * @param {Object[]} posts
 */
function initFilters(posts) {
  const bar = document.querySelector('.filter-bar');

  bar.addEventListener('click', event => {
    const btn = event.target.closest('.filter-btn');
    if (!btn) return;

    // Update active state
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderGrid(posts, btn.dataset.category);
  });
}

/** Wires up the mobile navigation toggle. */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close nav when a link is clicked
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/** Wires up the newsletter signup form. */
function initNewsletter() {
  const form      = document.getElementById('newsletterForm');
  const input     = document.getElementById('emailInput');
  const error     = document.getElementById('emailError');
  const success   = document.getElementById('newsletterSuccess');

  form.addEventListener('submit', event => {
    event.preventDefault();

    const email = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!valid) {
      error.classList.remove('hidden');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    error.classList.add('hidden');
    input.removeAttribute('aria-invalid');

    // Simulate async submission
    form.classList.add('hidden');
    success.classList.remove('hidden');
  });

  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid')) {
      error.classList.add('hidden');
      input.removeAttribute('aria-invalid');
    }
  });
}

/** Sets the current year in the footer copyright. */
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ─── Initialise ────────────────────────────────────────────── */

async function init() {
  try {
    const posts = await fetchPosts();

    renderFeatured(posts[0]);
    buildCategoryFilters(posts);
    renderGrid(posts);
    initFilters(posts);
  } catch (err) {
    console.error('Failed to load posts:', err);
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('postsGrid').classList.add('hidden');
    document.getElementById('featuredPost').innerHTML =
      '<p style="color:var(--color-error);padding:var(--space-4)">Could not load featured post.</p>';
  }

  initMobileNav();
  initNewsletter();
  setFooterYear();
}

init();
