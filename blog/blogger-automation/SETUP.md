# Blogger Automation — Setup Guide

Automates publishing your `posts.json` blog posts to **Blogger.com**.

---

## 📁 File Structure

```
blog/
├── data/
│   └── posts.json              ← Your blog content (source of truth)
└── blogger-automation/
    ├── publish-to-blogger.js   ← Main script
    ├── auth.js                 ← Google OAuth2 helper
    ├── list-posts.js           ← List posts on Blogger
    ├── published-tracker.json  ← Tracks what's been published (auto-updated)
    ├── credentials.json        ← 🔑 YOU ADD THIS (from Google Cloud Console)
    ├── token.json              ← Auto-created after first login
    └── package.json
```

---

## 🛠 Step-by-Step Setup

### Step 1 — Enable the Blogger API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"** → name it `Blog Automator` → Create
3. Go to **APIs & Services → Library**
4. Search for **"Blogger API v3"** → Enable it

### Step 2 — Create OAuth2 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials" → "OAuth 2.0 Client ID"**
3. Configure the consent screen if prompted (External, fill in app name)
4. Application type: **Desktop app**
5. Name it `Blog Automator` → Create
6. Click **Download JSON** → rename it `credentials.json`
7. Move `credentials.json` into the `blogger-automation/` folder

### Step 3 — Get Your Blog ID

1. Log in at [blogger.com](https://www.blogger.com)
2. Open your blog's dashboard
3. Look at the URL — it contains your Blog ID:
   ```
   https://www.blogger.com/blog/posts/1234567890123456789
                                       ^^^^^^^^^^^^^^^^^^^
                                       This is your Blog ID
   ```

### Step 4 — Install Dependencies

```bash
cd blog/blogger-automation
npm install
```

### Step 5 — Set Your Blog ID

**Windows PowerShell:**
```powershell
$env:BLOGGER_BLOG_ID = "1234567890123456789"
```

**Mac / Linux:**
```bash
export BLOGGER_BLOG_ID="1234567890123456789"
```

Or edit `publish-to-blogger.js` line 13 directly:
```js
BLOG_ID: '5180885703047178594',
```

---

## 🚀 Usage

### Preview what will be published (no API calls)
```bash
npm run publish:dry
```

### Publish only NEW posts (skips already published ones)
```bash
npm run publish
```

### Publish / update ALL posts
```bash
npm run publish:all
```

### Publish a single post by ID
```bash
node publish-to-blogger.js --post getting-started-with-web-development
```

### List all posts currently on your Blogger blog
```bash
npm run list
```

---

## 🔐 How Authentication Works

1. **First run:** A browser window opens → sign in with Google → grant access
2. A `token.json` file is saved automatically
3. **All future runs:** Uses the saved token (no browser needed)
4. Tokens auto-refresh when they expire

> ⚠️ **Never commit `credentials.json` or `token.json` to Git!**
> Add them to `.gitignore`:
> ```
> blogger-automation/credentials.json
> blogger-automation/token.json
> ```

---

## 📌 How the Tracker Works

`published-tracker.json` records every post you've published:

```json
{
  "getting-started-with-web-development": {
    "bloggerId"  : "1234567890",
    "url"        : "https://yourblog.blogspot.com/2025/03/getting-started.html",
    "publishedAt": "2025-03-15T10:00:00.000Z"
  }
}
```

- Running `npm run publish` skips posts already in this file
- Running `npm run publish:all` updates all posts on Blogger
- This file is auto-updated after each successful publish

---

## 🔄 Adding New Posts

1. Add a new entry to `data/posts.json`
2. Run `npm run publish` — only the new post will be published

---

## ❓ Troubleshooting

| Error | Fix |
|-------|-----|
| `credentials.json not found` | Download from Google Cloud Console and place in `blogger-automation/` |
| `invalid_grant` | Delete `token.json` and run again |
| `Port 3000 is in use` | Close other apps using port 3000 |
| `Blog ID not found` | Check your Blog ID in the Blogger dashboard URL |
| `403 Forbidden` | Make sure Blogger API v3 is enabled in Google Cloud |
| `insufficientPermissions` | Delete `token.json`, re-run, and grant all requested permissions |
