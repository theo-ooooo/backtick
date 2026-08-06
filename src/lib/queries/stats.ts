import { prisma } from "@/lib/prisma";

export interface DayCount {
  date: string; // YYYY-MM-DD (KST)
  count: number;
}

export interface PostStat {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: Date | null;
}

export interface WriterStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  streak: number; // 오늘(또는 어제)까지 연속 작성일
  days: DayCount[]; // 최근 371일 (53주)
  posts: PostStat[]; // 반응 순
}

const KST = "Asia/Seoul";

function kstDateKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: KST }); // YYYY-MM-DD
}

/** 내 글쓰기 활동 통계 — 잔디 캘린더용 일별 카운트 + 합계 + 글별 반응. */
export async function getWriterStats(userId: string): Promise<WriterStats> {
  const since = new Date(Date.now() - 371 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      views: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  // 일별 작성 수 (KST 기준, 생성일 기준 — 초안도 "쓴 날"로 친다)
  const byDay = new Map<string, number>();
  for (const p of posts) {
    if (p.createdAt < since) continue;
    const key = kstDateKey(p.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const days: DayCount[] = [...byDay.entries()].map(([date, count]) => ({ date, count }));

  // 연속 작성 스트릭 — 오늘 또는 어제부터 거슬러 올라가며 계산
  let streak = 0;
  const cursor = new Date();
  if (!byDay.has(kstDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(kstDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const postStats: PostStat[] = published
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      views: p.views,
      likes: p._count.likes,
      comments: p._count.comments,
      publishedAt: p.publishedAt,
    }))
    .sort((a, b) => b.views - a.views || b.likes - a.likes);

  return {
    totalPosts: published.length,
    totalViews: published.reduce((s, p) => s + p.views, 0),
    totalLikes: postStats.reduce((s, p) => s + p.likes, 0),
    totalComments: postStats.reduce((s, p) => s + p.comments, 0),
    streak,
    days,
    posts: postStats,
  };
}

/** 블로그 프로필용 — 일별 작성 수만 가볍게 (최근 371일, KST). */
export async function getWritingDays(userId: string): Promise<DayCount[]> {
  const since = new Date(Date.now() - 371 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: { authorId: userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (const p of posts) {
    const key = kstDateKey(p.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}
