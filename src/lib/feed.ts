import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { imgProxy } from "./img";

/** One unified card shape for the home feed (native posts + external posts). */
export interface FeedItem {
  kind: "native" | "external";
  title: string;
  url: string; // native: /@handle/slug, external: original article URL
  excerpt: string | null;
  author: string | null; // display name
  authorHandle: string | null; // native only
  authorImage: string | null; // native only
  source: string | null; // external only — e.g. "토스"
  thumbnail: string | null;
  likes: number | null;
  tags: string[];
  publishedAt: Date;
}

export type FeedTab = "all" | "backtick" | "tech";
export type FeedSort = "latest" | "popular";

// 카드에 필요한 필드만 — content(본문) 제외가 Supabase 이그레스 절감의 핵심
export const feedPostSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, handle: true, name: true, image: true } },
  tags: { select: { tag: { select: { name: true } } } },
  _count: { select: { likes: true } },
} satisfies Prisma.PostSelect;

export const feedExternalSelect = {
  title: true,
  url: true,
  excerpt: true,
  author: true,
  thumbnail: true,
  likes: true,
  tags: true,
  publishedAt: true,
  feed: { select: { name: true } },
} satisfies Prisma.ExternalPostSelect;

type PostWithRels = Prisma.PostGetPayload<{ select: typeof feedPostSelect }>;
type ExternalWithFeed = Prisma.ExternalPostGetPayload<{ select: typeof feedExternalSelect }>;

/** shared row mappers — feed/search/tag pages all produce the same card shape */
export function toFeedItem(p: PostWithRels): FeedItem {
  return {
    kind: "native",
    title: p.title,
    url: `/@${p.author.handle}/${p.slug}`,
    excerpt: p.excerpt,
    author: p.author.name ?? p.author.handle,
    authorHandle: p.author.handle,
    authorImage: imgProxy(p.author.image, "avatar", p.author.id),
    source: null,
    thumbnail: imgProxy(p.coverImage, "cover", p.id, p.updatedAt),
    likes: p._count.likes > 0 ? p._count.likes : null,
    tags: p.tags.map((t) => t.tag.name),
    publishedAt: p.publishedAt ?? p.createdAt,
  };
}

export function toExternalFeedItem(e: ExternalWithFeed): FeedItem {
  return {
    kind: "external",
    title: e.title,
    url: e.url,
    excerpt: e.excerpt,
    author: e.author,
    authorHandle: null,
    authorImage: null,
    source: e.feed.name,
    thumbnail: e.thumbnail,
    likes: e.likes,
    tags: e.tags,
    publishedAt: e.publishedAt,
  };
}

/** 통합 피드 — page 단위 무한스크롤 (0부터). 병합 정렬 특성상 오버페치 후 창을 자른다. */
export async function getFeed(
  tab: FeedTab,
  sort: FeedSort = "latest",
  page = 0,
  take = 20,
  sources?: string[], // 기술블로그 소스 필터 (비면 전체)
): Promise<FeedItem[]> {
  // 소스 필터를 골랐다면 그 소스만 보겠다는 뜻 — 백틱 네이티브 글은 제외
  const wantNative = (tab === "all" || tab === "backtick") && !sources?.length;
  const wantExternal = tab === "all" || tab === "tech";
  const window = (page + 1) * take;

  const [posts, externals] = await Promise.all([
    wantNative
      ? prisma.post.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: window,
          select: feedPostSelect,
        })
      : Promise.resolve([]),
    wantExternal
      ? prisma.externalPost.findMany({
          where: sources?.length ? { feed: { name: { in: sources } } } : undefined,
          orderBy: { publishedAt: "desc" },
          take: window,
          select: feedExternalSelect,
        })
      : Promise.resolve([]),
  ]);

  const native: FeedItem[] = posts.map(toFeedItem);
  const external: FeedItem[] = externals.map(toExternalFeedItem);

  const merged = [...native, ...external];
  if (sort === "popular") {
    // 트렌딩 — 좋아요를 경과 시간으로 감쇠 (오래된 인기글이 상단을 점령하지 않게)
    const score = (i: FeedItem) => {
      const hours = Math.max(0, (Date.now() - i.publishedAt.getTime()) / 3600000);
      return ((i.likes ?? 0) + 1) / Math.pow(hours + 2, 1.2);
    };
    merged.sort((a, b) => score(b) - score(a));
  } else {
    merged.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }
  return merged.slice(page * take, window);
}

export interface TrendingTag {
  name: string;
  count: number;
}

/** Most-used tags across recently collected posts — the sidebar's numbered list. */
export async function getTrendingTags(limit = 6): Promise<TrendingTag[]> {
  const rows = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT unnest(tags) AS name, count(*) AS count
    FROM external_posts
    WHERE "publishedAt" > now() - interval '30 days'
    GROUP BY 1 HAVING count(*) >= 2
    ORDER BY count DESC, name ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}
