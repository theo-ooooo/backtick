import { prisma } from "@/lib/prisma";

/** 활성 수집 소스 목록 (칩 용). */
export async function getEnabledFeeds() {
  return prisma.feed.findMany({ where: { enabled: true }, orderBy: { name: "asc" } });
}

/** 소스 카드 그리드 용 — 글 수, 마지막 수집 시각 포함. */
export async function getSourcesWithStats() {
  return prisma.feed.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    include: {
      posts: { orderBy: { fetchedAt: "desc" }, take: 1, select: { fetchedAt: true } },
      _count: { select: { posts: true } },
    },
  });
}
