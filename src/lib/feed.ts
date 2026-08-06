import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

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

type PostWithRels = Prisma.PostGetPayload<{ include: { author: true; tags: { include: { tag: true } } } }>;
type ExternalWithFeed = Prisma.ExternalPostGetPayload<{ include: { feed: true } }>;

/** shared row mappers — feed/search/tag pages all produce the same card shape */
export function toFeedItem(p: PostWithRels): FeedItem {
  return {
    kind: "native",
    title: p.title,
    url: `/@${p.author.handle}/${p.slug}`,
    excerpt: p.excerpt,
    author: p.author.name ?? p.author.handle,
    authorHandle: p.author.handle,
    authorImage: p.author.image,
    source: null,
    thumbnail: p.coverImage,
    likes: null,
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

export async function getFeed(tab: FeedTab, take = 40): Promise<FeedItem[]> {
  const wantNative = tab === "all" || tab === "backtick";
  const wantExternal = tab === "all" || tab === "tech";

  const [posts, externals] = await Promise.all([
    wantNative
      ? prisma.post.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take,
          include: { author: true, tags: { include: { tag: true } } },
        })
      : Promise.resolve([]),
    wantExternal
      ? prisma.externalPost.findMany({
          orderBy: { publishedAt: "desc" },
          take: take * 4, // over-fetch so per-source capping still fills the page
          include: { feed: true },
        })
      : Promise.resolve([]),
  ]);

  const native: FeedItem[] = posts.map(toFeedItem);
  const external: FeedItem[] = externals.map(toExternalFeedItem);

  // cap per external source so a chatty feed (e.g. GeekNews) can't flood the page
  const PER_SOURCE_CAP = 6;
  const seen = new Map<string, number>();
  const capped = external
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .filter((e) => {
      const n = (seen.get(e.source!) ?? 0) + 1;
      seen.set(e.source!, n);
      return n <= PER_SOURCE_CAP;
    });

  return [...native, ...capped]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, take);
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
