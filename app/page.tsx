"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, FormEvent } from "react";

const Hero3D = dynamic(() => import("@/components/Hero3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-bg" />,
});

interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: string;
  rewrittenTitle?: string;
  rewrittenContent?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags?: string[];
  image?: string;
}

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featured, setFeatured] = useState<Article | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    const firstName = data.get("firstName");
    const lastName = data.get("lastName");
    const email = data.get("email");
    const message = data.get("message");

    const mailtoLink = `mailto:anuraag.gupta@example.com?subject=Message from ${firstName} ${lastName}&body=${encodeURIComponent(String(message))}%0A%0AFrom: ${firstName} ${lastName} (${email})`;
    window.open(mailtoLink, "_blank");
    setFormStatus("sent");
    form.reset();
    setTimeout(() => setFormStatus("idle"), 3000);
  };

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (data.featured) setFeatured(data.featured);
        if (data.articles) setArticles(data.articles.slice(0, 3));
      })
      .catch(() => {});

    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        if (data.posts) setBlogPosts(data.posts.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <Hero3D />

        <div className="absolute inset-0 z-[1] pointer-events-none">
          <div className="absolute inset-0 bg-glow-purple opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-tight whitespace-nowrap"
          >
            Anuraag <span className="gradient-text">Gupta</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-sm text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed"
          >
            Crafting immersive digital experiences at the intersection of 3D graphics,
            visual effects, and interactive web technologies.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/about"
              className="group relative px-8 py-3 bg-accent hover:bg-purple-500 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              About Me
            </Link>
            <a
              href="https://www.linkedin.com/in/anuragg-gupta-36609981/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 glass glow-border text-white font-medium rounded-xl hover:bg-white/5 transition-all duration-300"
            >
              LinkedIn
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-5 h-8 rounded-full border border-gray-600 flex justify-center pt-1.5"
            >
              <div className="w-1 h-2 rounded-full bg-gray-500" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Train of Thought / Featured Post Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm tracking-[0.3em] uppercase text-gray-400 mb-6"
          >
            Everything is personal. Including this blog.
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black text-white mb-12 leading-[0.95]"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Train of Thought
          </motion.h2>

          {/* Featured Blog Post — My Writing */}
          {blogPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-left mb-12"
            >
              <div className="inline-block mb-6">
                <span className="text-xs tracking-[0.2em] uppercase text-white border border-white/20 px-4 py-2">
                  Featured Post
                </span>
              </div>

              <Link href={`/blog/${blogPosts[0].slug}`} className="block group">
                <div className="relative rounded-2xl overflow-hidden aspect-[16/7]">
                  {blogPosts[0].image ? (
                    <img
                      src={blogPosts[0].image}
                      alt={blogPosts[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent/30 via-purple-700/30 to-blue-600/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                    {blogPosts[0].tags && blogPosts[0].tags.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {blogPosts[0].tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 capitalize"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-gray-300 mb-2 block">
                      Anuraag Gupta &middot;{" "}
                      {new Date(blogPosts[0].date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <h3 className="text-xl sm:text-3xl font-bold text-white leading-snug group-hover:text-accent transition-colors duration-300">
                      {blogPosts[0].title}
                    </h3>
                    <p className="text-sm text-gray-300 mt-3 line-clamp-2 max-w-2xl">
                      {blogPosts[0].excerpt}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Featured News Post */}
          {featured && (
            <motion.a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="block group text-left"
            >
              <div className="inline-block mb-6">
                <span className="text-xs tracking-[0.2em] uppercase text-white border border-white/20 px-4 py-2 hover:bg-white/5 transition-colors">
                  Global News
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/7]">
                {featured.urlToImage ? (
                  <img
                    src={featured.urlToImage}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/30 to-blue-600/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                  <span className="text-xs text-gray-300 mb-2 block">
                    {featured.source} &middot;{" "}
                    {new Date(featured.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-bold text-white leading-snug group-hover:text-accent transition-colors duration-300">
                    {featured.rewrittenTitle || featured.title}
                  </h3>
                </div>
              </div>
            </motion.a>
          )}
        </div>
      </section>

      {/* Latest Thoughts Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Latest Thoughts
            </h2>
          </motion.div>

          {articles.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {articles.map((article, i) => (
                <motion.a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="group flex flex-col bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-accent/30 hover:bg-white/[0.05] transition-all duration-500"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] overflow-hidden">
                    {article.urlToImage ? (
                      <img
                        src={article.urlToImage}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-blue-500/20" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <span className="text-xs text-gray-500 mb-3">
                      {new Date(article.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    <h3 className="text-lg font-semibold text-white mb-3 leading-snug group-hover:text-accent transition-colors duration-300 line-clamp-2">
                      {article.rewrittenTitle || article.title}
                    </h3>

                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                      {article.rewrittenContent || article.description || "Explore this article for more details."}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-white/[0.06]">
                  <div className="aspect-[4/3] bg-white/[0.03] animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-16 bg-white/[0.05] rounded animate-pulse" />
                    <div className="h-5 w-full bg-white/[0.05] rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-white/[0.05] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View All Link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mt-12"
          >
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-purple-400 transition-colors font-medium"
            >
              View all articles &rarr;
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Drop Me a Line Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Drop Me a Line,
              <br />
              Let Me Know What You Think
            </h2>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-light rounded-2xl p-8 sm:p-10 glow-border space-y-6"
          >
            {/* Name Row */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-accent mb-2">
                  First name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-accent mb-2">
                  Last name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-accent mb-2">
                Email <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                placeholder="john@example.com"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-accent mb-2">
                Message
              </label>
              <textarea
                name="message"
                rows={5}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                placeholder="Write your message here..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formStatus === "sending"}
                className="px-10 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50"
              >
                {formStatus === "sent" ? "Sent!" : formStatus === "sending" ? "Sending..." : "Submit"}
              </button>
            </div>
          </motion.form>
        </div>
      </section>
    </>
  );
}
