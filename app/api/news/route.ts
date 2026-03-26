import { NextResponse } from "next/server";

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NEWS_URL = "https://newsapi.org/v2/everything";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: string;
  rewrittenTitle?: string;
  rewrittenContent?: string;
}

async function rewriteWithGemini(title: string, description: string): Promise<{ rewrittenTitle: string; rewrittenContent: string }> {
  if (!GEMINI_API_KEY) {
    return { rewrittenTitle: title, rewrittenContent: description };
  }

  try {
    const prompt = `You are a blog writer for Anuraag Gupta's personal tech blog. Rewrite this news article in a conversational, humanized blog style. Write as if you're sharing an interesting story with your readers.

Original title: ${title}
Original description: ${description}

Respond in this exact JSON format only, no markdown:
{"title": "your rewritten engaging title", "content": "your rewritten 2-3 paragraph blog-style content (around 150-200 words). Make it personal, insightful, and engaging. Add your own perspective and analysis."}`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rewrittenTitle: parsed.title || title,
        rewrittenContent: parsed.content || description,
      };
    }

    return { rewrittenTitle: title, rewrittenContent: description };
  } catch {
    return { rewrittenTitle: title, rewrittenContent: description };
  }
}

export async function GET() {
  if (!NEWS_API_KEY) {
    return NextResponse.json({ error: "News API key not configured" }, { status: 500 });
  }

  try {
    // Fetch global/top headlines for featured post
    const globalUrl = `https://newsapi.org/v2/top-headlines?category=technology&pageSize=1&language=en&apiKey=${NEWS_API_KEY}`;
    const globalRes = await fetch(globalUrl, { next: { revalidate: 86400 } });
    const globalData = await globalRes.json();

    let featured: NewsArticle | null = null;
    if (globalData.status === "ok" && globalData.articles?.length > 0) {
      const a = globalData.articles[0];
      featured = {
        title: a.title,
        description: a.description || "",
        url: a.url,
        urlToImage: a.urlToImage,
        publishedAt: a.publishedAt,
        source: a.source?.name || "Unknown",
      };
      const { rewrittenTitle, rewrittenContent } = await rewriteWithGemini(featured.title, featured.description);
      featured.rewrittenTitle = rewrittenTitle;
      featured.rewrittenContent = rewrittenContent;
    }

    // Fetch topic-based articles for the cards
    const query = "mythology OR technology OR business OR artificial intelligence OR innovation";
    const url = `${NEWS_URL}?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${NEWS_API_KEY}`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();

    if (data.status !== "ok") {
      return NextResponse.json({ error: data.message || "Failed to fetch news" }, { status: 500 });
    }

    const rawArticles: NewsArticle[] = (data.articles || []).map((article: Record<string, unknown>) => ({
      title: article.title as string,
      description: article.description as string,
      url: article.url as string,
      urlToImage: article.urlToImage as string | null,
      publishedAt: article.publishedAt as string,
      source: (article.source as Record<string, string>)?.name || "Unknown",
    }));

    // Rewrite all articles in parallel
    const articles = await Promise.all(
      rawArticles.map(async (article) => {
        const { rewrittenTitle, rewrittenContent } = await rewriteWithGemini(
          article.title,
          article.description || ""
        );
        return {
          ...article,
          rewrittenTitle,
          rewrittenContent,
        };
      })
    );

    return NextResponse.json({ featured, articles });
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
