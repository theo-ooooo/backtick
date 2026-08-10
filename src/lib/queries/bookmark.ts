import { prisma } from "@/lib/prisma";
import { feedPostSelect, feedExternalSelect, toFeedItem, toExternalFeedItem, type FeedItem } from "@/lib/feed";

/** 내 저장함 — 북마크 순(최신 먼저)으로 피드 카드 형태로 반환. */
export async function getBookmarkedItems(userId: string): Promise<FeedItem[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      post: { select: feedPostSelect },
      externalPost: { select: feedExternalSelect },
    },
  });
  return rows
    .map((b) => (b.post ? toFeedItem(b.post) : b.externalPost ? toExternalFeedItem(b.externalPost) : null))
    .filter((x): x is FeedItem => x !== null);
}
