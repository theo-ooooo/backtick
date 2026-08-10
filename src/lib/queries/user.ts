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
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          publishedAt: true,
          createdAt: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
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
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      createdAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
}

/** 블로그 개요 탭 — 조회수 상위 발행글. */
export async function getPopularPosts(userId: string, take = 3) {
  return prisma.post.findMany({
    where: { authorId: userId, status: "PUBLISHED" },
    orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
    take,
    select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, views: true, publishedAt: true, readMinutes: true },
  });
}

/** 유저의 컬렉션(시리즈) 목록 + 글 수. */
export async function getCollections(userId: string) {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, description: true,
      _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: { id: true, title: true, coverImage: true },
      },
    },
  });
}

/** 유저가 속한 팀 목록. */
export async function getUserTeams(userId: string) {
  const rows = await prisma.teamMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { team: { select: { name: true, slug: true } } },
  });
  return rows.map((r) => r.team);
}
