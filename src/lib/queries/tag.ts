import { prisma } from "@/lib/prisma";
import { toFeedItem, toExternalFeedItem, type FeedItem } from "@/lib/feed";

/** 전체 태그 + 사용 횟수 (수집 글 + 백틱 글 합산). */
export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const [externalRows, nativeRows] = await Promise.all([
    prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT unnest(tags) AS name, count(*) AS count
      FROM external_posts GROUP BY 1
    `,
    prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT t.name AS name, count(*) AS count
      FROM post_tags pt JOIN tags t ON t.id = pt."tagId"
      GROUP BY 1
    `,
  ]);
  const merged = new Map<string, number>();
  for (const r of [...externalRows, ...nativeRows]) {
    merged.set(r.name, (merged.get(r.name) ?? 0) + Number(r.count));
  }
  return [...merged.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 특정 태그가 붙은 글 (백틱 + 수집, 최신순). */
export async function getTagFeed(tag: string, take = 40): Promise<FeedItem[]> {
  const [externals, posts] = await Promise.all([
    prisma.externalPost.findMany({
      where: { tags: { has: tag } },
      orderBy: { publishedAt: "desc" },
      take,
      include: { feed: true },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", tags: { some: { tag: { name: tag } } } },
      orderBy: { publishedAt: "desc" },
      take,
      include: { author: true, tags: { include: { tag: true } } },
    }),
  ]);
  return [...posts.map(toFeedItem), ...externals.map(toExternalFeedItem)].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}
