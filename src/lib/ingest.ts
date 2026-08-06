import Parser from "rss-parser";
import { prisma } from "./prisma";

type CustomItem = {
  contentEncoded?: string;
  mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[];
};

const parser: Parser<Record<string, never>, CustomItem> = new Parser({
  timeout: 15000,
  headers: {
    // some blogs (D2, Kurly) reject the default rss-parser UA
    "User-Agent": "Mozilla/5.0 (compatible; BacktickBot/1.0; +https://backtick.blog)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
    ],
  },
});

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** Strip HTML tags/entities and clamp for card excerpts. */
function toExcerpt(html: string | undefined, max = 200): string | null {
  if (!html) return null;
  const text = decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, max) : null;
}

/** Normalize RSS categories into a few short tags. */
function toTags(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((c) => (typeof c === "string" ? c : typeof c === "object" && c ? String((c as { _?: string })._ ?? "") : ""))
    .map((t) => decodeEntities(t).trim().toLowerCase())
    .filter((t) => t && t.length <= 24 && !/^(기타|일반|블로그|uncategorized)$/i.test(t))
    .slice(0, 4);
}

/** Best-effort thumbnail: enclosure → media:content → first <img> in content. */
function toThumbnail(item: Parser.Item & CustomItem): string | null {
  const enc = item.enclosure?.url;
  if (enc && /^https?:\/\//.test(enc)) return enc;
  const media = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
  const mediaUrl = media?.$?.url;
  if (mediaUrl && /^https?:\/\//.test(mediaUrl)) return mediaUrl;
  const html = item.contentEncoded ?? item.content ?? "";
  const m = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

export interface IngestResult {
  feed: string;
  fetched: number;
  inserted: number;
  error?: string;
}

interface NormalizedItem {
  title: string;
  url: string;
  excerpt: string | null;
  author: string | null;
  thumbnail: string | null;
  likes: number | null;
  tags: string[];
  publishedAt: Date;
}

/** velog's public recent-RSS is spam-ridden; use the trending GraphQL API instead. */
async function fetchVelogTrendingPage(timeframe: string, limit: number, offset = 0) {
  const res = await fetch("https://v3.velog.io/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `query trendingPosts($input: TrendingPostsInput!){
        trendingPosts(input:$input){ title short_description thumbnail likes tags url_slug released_at user{ username } }
      }`,
      variables: { input: { limit, offset, timeframe } },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`velog graphql ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      trendingPosts?: {
        title: string;
        short_description?: string;
        thumbnail?: string;
        likes?: number;
        tags?: string[];
        url_slug: string;
        released_at: string;
        user: { username: string };
      }[];
    };
  };
  return (json.data?.trendingPosts ?? []).map((p) => ({
    title: p.title.trim(),
    url: `https://velog.io/@${p.user.username}/${encodeURIComponent(p.url_slug)}`,
    excerpt: toExcerpt(p.short_description),
    author: p.user.username,
    thumbnail: p.thumbnail ?? null,
    likes: p.likes ?? null,
    tags: (p.tags ?? []).map((t) => t.toLowerCase()).slice(0, 4),
    publishedAt: new Date(p.released_at),
  }));
}

/** 주간 트렌딩 + 월간 트렌딩을 합쳐 폭넓게 수집 (url 기준 중복 제거는 upsert가 처리). */
async function fetchVelogTrending(): Promise<NormalizedItem[]> {
  const [week, month] = await Promise.all([
    fetchVelogTrendingPage("week", 50),
    fetchVelogTrendingPage("month", 50),
  ]);
  const seen = new Set<string>();
  return [...week, ...month].filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)));
}

async function fetchRss(rssUrl: string): Promise<NormalizedItem[]> {
  const parsed = await parser.parseURL(rssUrl);
  const items: NormalizedItem[] = [];
  for (const item of parsed.items ?? []) {
    const url = item.link?.trim();
    const title = item.title?.trim();
    if (!url || !title) continue;
    items.push({
      title: decodeEntities(title).slice(0, 300),
      url,
      excerpt: toExcerpt(item.contentSnippet ?? item.content),
      author: item.creator?.trim()?.slice(0, 100) ?? null,
      thumbnail: toThumbnail(item),
      likes: null,
      tags: toTags(item.categories),
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
    });
  }
  return items;
}

/** Fetch every enabled feed in parallel (serverless 시간 제한 안에 들어오도록); one failing feed never blocks the others. */
export async function ingestAllFeeds(): Promise<IngestResult[]> {
  const feeds = await prisma.feed.findMany({ where: { enabled: true } });

  return Promise.all(
    feeds.map(async (feed): Promise<IngestResult> => {
      try {
        const items =
          feed.rssUrl === "velog:trending" ? await fetchVelogTrending() : await fetchRss(feed.rssUrl);
        let inserted = 0;
        for (const it of items) {
          const res = await prisma.externalPost.upsert({
            where: { url: it.url },
            // refresh mutable metadata on re-ingest (likes climb, tags/thumbs improve)
            update: { likes: it.likes, tags: it.tags, thumbnail: it.thumbnail, excerpt: it.excerpt },
            create: { feedId: feed.id, ...it },
          });
          if (res.fetchedAt.getTime() > Date.now() - 5000) inserted++;
        }
        return { feed: feed.name, fetched: items.length, inserted };
      } catch (e) {
        return { feed: feed.name, fetched: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
}
