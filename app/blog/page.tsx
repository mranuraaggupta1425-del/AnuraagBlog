"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setArticles(data.articles || []);
        }
      })
      .catch(() => setError("Failed to load articles"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Daily Digest
          </h1>
          <div className="neon-line w-20 mb-4" />
          <p className="text-gray-500 text-sm">
            Fresh perspectives on technology, business, AI, innovation &amp; mythology — rewritten daily with a human touch.
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Crafting today&apos;s stories...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-light rounded-2xl p-8 glow-border text-center">
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {/* Articles */}
        <div className="space-y-8">
          {articles.map((article, i) => (
            <motion.article
              key={article.url}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-light rounded-2xl overflow-hidden glow-border"
            >
              {/* Image */}
              {article.urlToImage && (
                <div className="h-56 overflow-hidden">
                  <img
                    src={article.urlToImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {article.source}
                  </span>
                  <time className="text-xs text-gray-500">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 leading-tight">
                  {article.rewrittenTitle || article.title}
                </h2>

                {/* Rewritten blog content */}
                <div className="text-gray-400 leading-relaxed text-sm sm:text-base">
                  {article.rewrittenContent ? (
                    <>
                      <p>
                        {expanded === article.url
                          ? article.rewrittenContent
                          : article.rewrittenContent.slice(0, 250) + (article.rewrittenContent.length > 250 ? "..." : "")}
                      </p>
                      {article.rewrittenContent.length > 250 && (
                        <button
                          onClick={() => setExpanded(expanded === article.url ? null : article.url)}
                          className="mt-3 text-accent hover:text-purple-400 text-sm font-medium transition-colors"
                        >
                          {expanded === article.url ? "Show less" : "Read more"}
                        </button>
                      )}
                    </>
                  ) : (
                    <p>{article.description}</p>
                  )}
                </div>

                {/* Source link */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-accent transition-colors"
                  >
                    <span>Original source: {article.source}</span>
                    <span>&rarr;</span>
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
