import { prisma } from "@/lib/prisma";
import { toFeedItem, toExternalFeedItem, type FeedItem } from "@/lib/feed";

/** 제목·본문 통합 검색 (백틱 글 + 수집 글, 최신순). */
export async function searchAll(q: string, take = 30): Promise<FeedItem[]> {
  const [externals, posts] = await Promise.all([
    prisma.externalPost.findMany({
      where: {
        OR: [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }],
      },
      orderBy: { publishedAt: "desc" },
      take,
      include: { feed: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }],
      },
      orderBy: { publishedAt: "desc" },
      take,
      include: { author: true, tags: { include: { tag: true } } },
    }),
  ]);
  return [...posts.map(toFeedItem), ...externals.map(toExternalFeedItem)].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}
