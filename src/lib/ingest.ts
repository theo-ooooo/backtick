import Parser from "rss-parser";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import dns from "node:dns";
import { prisma } from "./prisma";

// v3.velog.io가 IPv6 우선 조회에서 수 초씩 지연/타임아웃 — IPv4 우선으로
dns.setDefaultResultOrder?.("ipv4first");

const execFileAsync = promisify(execFile);

type CustomItem = {
  contentEncoded?: string;
  mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[];
};

const parser: Parser<Record<string, never>, CustomItem> = new Parser({
  timeout: 15000,
  headers: {
    // 일부 블로그(D2, 우아한형제들 등)는 봇 UA·데이터센터 IP에 민감 — 브라우저급 헤더 사용
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept-Language": "ko,en;q=0.8",
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

/** velog 트렌딩용 AI 분류 — 개발/기술 글만 남긴다 (광고·일상·판매글 제거). 실패 시 통과. */
async function filterDevOnly(items: NormalizedItem[]): Promise<NormalizedItem[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || items.length === 0) return items;
  try {
    const list = items.map((it, i) => `${i}: ${it.title} [${it.tags.join(",")}]`).join("\n");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "개발 블로그 큐레이션 필터다. 확실한 비기술 글(광고, 상품 판매, 명품, 도박, 성인, 순수 여행/음식/일상)만 제외한다. 개발자의 회고·커리어·취업기·스터디 기록은 기술 글로 보고 통과시킨다. 애매하면 통과시킨다.",
          },
          {
            role: "user",
            content: `다음 글 목록에서 개발·기술 관련 글의 번호만 JSON 배열로 답해. 다른 말 없이 배열만.\n${list}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return items;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const m = /\[[\d,\s]*\]/.exec(json.choices?.[0]?.message?.content ?? "");
    if (!m) return items;
    const keep = new Set(JSON.parse(m[0]) as number[]);
    const filtered = items.filter((_, i) => keep.has(i));
    // 절반 넘게 잘리면 분류 오작동으로 보고 원본 유지 (트렌딩은 대부분 개발 글이다)
    if (filtered.length < items.length / 2) return items;
    for (const [i, it] of items.entries()) {
      if (!keep.has(i)) console.log(`[filter] drop: ${it.title}`);
    }
    return filtered;
  } catch {
    return items;
  }
}

/** 스팸 수집 차단 — 광고 키워드·국제전화 패턴, velog 트렌딩은 한글 없는 글을 걸러낸다. */
function looksSpam(item: { title: string; excerpt: string | null }, feedName: string): boolean {
  const text = `${item.title} ${item.excerpt ?? ""}`;
  if (/(escorts?|call ?girls?|casino|betting|viagra|buy .{0,30}accounts?|verified sellers?|출장안마|출장마사지|텔레그램 ?@|레플리카|미러급|명품 ?(시계|가방|선글라스)|구매대행)/i.test(text)) return true;
  if (/카톡 ?[A-Za-z0-9]{3,}/.test(text)) return true;
  if (/\+\d{2,3}[ -]?\d{3,4}[ -]?\d{6,}/.test(text)) return true;
  if (feedName === "velog" && !/[가-힣]/.test(text)) return true;
  return false;
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

/** velog's public recent-RSS is spam-ridden; use the trending GraphQL API instead.
 *  velog GraphQL은 종종 수십 초씩 느려서 타임아웃을 넉넉히 주고 1회 재시도한다. */
async function fetchVelogTrendingPage(timeframe: string, limit: number, offset = 0, retry = 3) {
  const res = await fetch("https://v3.velog.io/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://velog.io",
      referer: "https://velog.io/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      query: `query trendingPosts($input: TrendingPostsInput!){
        trendingPosts(input:$input){ title short_description thumbnail likes tags url_slug released_at user{ username } }
      }`,
      variables: { input: { limit, offset, timeframe } },
    }),
    signal: AbortSignal.timeout(55000),
  }).catch((e: Error) => {
    if (retry > 0) return null;
    throw e;
  });
  if (!res) return fetchVelogTrendingPage(timeframe, limit, offset, retry - 1);
  if (!res.ok) {
    if (retry > 0) {
      await new Promise((r) => setTimeout(r, 5000)); // velog 서버 불안정 — 잠깐 쉬고 재시도
      return fetchVelogTrendingPage(timeframe, limit, offset, retry - 1);
    }
    throw new Error(`velog graphql ${res.status}`);
  }
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

/** 우아한형제들 등 일부 WAF는 Node TLS 핑거프린트를 차단(curl은 통과) — curl로 받아 파싱 */
async function fetchRssViaCurl(rssUrl: string) {
  const { stdout } = await execFileAsync(
    "curl",
    ["-sfL", "--max-time", "20", "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", rssUrl],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return parser.parseString(stdout);
}

async function fetchRss(rssUrl: string): Promise<NormalizedItem[]> {
  const parsed = await parser.parseURL(rssUrl).catch(async (e: Error) => {
    if (/403/.test(e.message)) return fetchRssViaCurl(rssUrl);
    throw e;
  });
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
  // INGEST_ONLY="velog,우아한형제들" — 데이터센터 IP가 막힌 소스만 로컬 등 다른 네트워크에서 골라 수집
  const only = process.env.INGEST_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
  const feeds = await prisma.feed.findMany({
    where: { enabled: true, ...(only?.length ? { name: { in: only } } : {}) },
  });

  return Promise.all(
    feeds.map(async (feed): Promise<IngestResult> => {
      try {
        const fetched =
          feed.rssUrl === "velog:trending" ? await fetchVelogTrending() : await fetchRss(feed.rssUrl);
        const keywordFiltered = fetched.filter((it) => !looksSpam(it, feed.name));
        const items =
          feed.rssUrl === "velog:trending" ? await filterDevOnly(keywordFiltered) : keywordFiltered;
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
