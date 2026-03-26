# Creative Developer Portfolio

A premium 3D portfolio and blog built with Next.js, Three.js, MDX, and Tailwind CSS.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (dark theme, glassmorphism)
- **React Three Fiber** (3D hero with particles)
- **Framer Motion** (page transitions, scroll animations)
- **MDX** (blog posts via `next-mdx-remote`)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx            # Home (3D hero)
  blog/
    page.tsx          # Blog listing
    [slug]/page.tsx   # Blog post (MDX)
  skills/page.tsx     # Skills (parsed from markdown)
  about/page.tsx      # About page
components/
  Hero3D.tsx          # React Three Fiber 3D scene
  Navbar.tsx          # Glass nav with mobile menu
  BlogCard.tsx        # Blog post card
  Footer.tsx          # Site footer
content/
  skills.md           # Skills data (parsed at build)
  blog/*.mdx          # Blog posts
lib/
  posts.ts            # Blog post utilities
  mdx.ts              # Markdown parsing
```

## Adding Blog Posts

Create a new `.mdx` file in `content/blog/`:

```mdx
---
title: "Your Post Title"
date: "2026-03-21"
excerpt: "A short description."
tags: ["tag1", "tag2"]
---

Your content here with **markdown** support.
```

The post will appear automatically on the blog page.

## Editing Skills

Edit `content/skills.md`. The skills page parses section headers (`## emoji Title`) and table rows (`| Skill | Level |`) automatically.
