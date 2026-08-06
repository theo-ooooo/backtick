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
        include: { tags: { include: { tag: true } } },
      },
    },
  });
}
