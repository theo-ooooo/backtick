import Parser from "rss-parser";
import { prisma } from "./prisma";

const parser = new Parser({
  timeout: 15000,
  headers: {
    // some blogs (D2, Kurly) reject the default rss-parser UA
    "User-Agent": "Mozilla/5.0 (compatible; BacktickBot/1.0; +https://backtick.blog)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
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

export interface IngestResult {
  feed: string;
  fetched: number;
  inserted: number;
  error?: string;
}

interface RssLikeItem {
  title?: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
}

/** velog's public recent-RSS is spam-ridden; use the trending GraphQL API instead. */
async function fetchVelogTrending(): Promise<RssLikeItem[]> {
  const res = await fetch("https://v3.velog.io/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `query trendingPosts($input: TrendingPostsInput!){
        trendingPosts(input:$input){ title short_description url_slug released_at user{ username } }
      }`,
      variables: { input: { limit: 30, offset: 0, timeframe: "week" } },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`velog graphql ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      trendingPosts?: {
        title: string;
        short_description?: string;
        url_slug: string;
        released_at: string;
        user: { username: string };
      }[];
    };
  };
  return (json.data?.trendingPosts ?? []).map((p) => ({
    title: p.title,
    link: `https://velog.io/@${p.user.username}/${encodeURIComponent(p.url_slug)}`,
    isoDate: p.released_at,
    contentSnippet: p.short_description,
    creator: p.user.username,
  }));
}

/** Fetch every enabled feed; one failing feed never blocks the others. */
export async function ingestAllFeeds(): Promise<IngestResult[]> {
  const feeds = await prisma.feed.findMany({ where: { enabled: true } });
  const results: IngestResult[] = [];

  for (const feed of feeds) {
    try {
      const items: RssLikeItem[] =
        feed.rssUrl === "velog:trending"
          ? await fetchVelogTrending()
          : (await parser.parseURL(feed.rssUrl)).items ?? [];
      let inserted = 0;
      for (const item of items) {
        const url = item.link?.trim();
        const title = item.title?.trim();
        if (!url || !title) continue;
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();
        const res = await prisma.externalPost.upsert({
          where: { url },
          update: {}, // keep first ingest; external posts rarely change
          create: {
            feedId: feed.id,
            title: decodeEntities(title).slice(0, 300),
            url,
            excerpt: toExcerpt(item.contentSnippet ?? item.content),
            author: item.creator?.trim()?.slice(0, 100) ?? null,
            publishedAt,
          },
        });
        if (res.fetchedAt.getTime() > Date.now() - 5000) inserted++;
      }
      results.push({ feed: feed.name, fetched: items.length, inserted });
    } catch (e) {
      results.push({ feed: feed.name, fetched: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
