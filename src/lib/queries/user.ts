import { prisma } from "@/lib/prisma";

/** "@handle" 경로 파라미터 → 유저 + 발행 글. 형식이 아니면 null. */
export async function getUserWithPosts(handleParam: string) {
  const decoded = decodeURIComponent(handleParam);
  if (!decoded.startsWith("@")) return null;
  const handle = decoded.slice(1).toLowerCase();
  return prisma.user.findUnique({
    where: { handle },
    include: {
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 12, // 첫 페이지 — 이후는 /api/blog-posts 무한스크롤
        include: { tags: { include: { tag: true } } },
      },
      _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
    },
  });
}

/** 블로그 무한스크롤 페이지 단위 조회 (12개씩). */
export async function getBlogPostsPage(handleParam: string, page: number, take = 12) {
  const handle = decodeURIComponent(handleParam).replace(/^@/, "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!user) return null;
  return prisma.post.findMany({
    where: { authorId: user.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    skip: page * take,
    take,
    include: { tags: { include: { tag: true } } },
  });
}
