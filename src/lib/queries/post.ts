import { prisma } from "@/lib/prisma";

/** 이 유저가 이 글에 좋아요를 눌렀는지. */
export async function hasLiked(postId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const row = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { postId: true },
  });
  return Boolean(row);
}

/** 발행된 글 상세 — "@handle"/slug 경로 파라미터 기준. */
export async function getPublishedPost(handleParam: string, slugParam: string) {
  const decoded = decodeURIComponent(handleParam);
  if (!decoded.startsWith("@")) return null;
  const handle = decoded.slice(1).toLowerCase();
  const slug = decodeURIComponent(slugParam);
  const author = await prisma.user.findUnique({ where: { handle } });
  if (!author) return null;
  return prisma.post.findFirst({
    where: { authorId: author.id, slug, status: "PUBLISHED" },
    include: { author: true, tags: { include: { tag: true } }, _count: { select: { likes: true } } },
  });
}

/** 내가 쓴 글 전부 (초안 포함, 최근 수정순). */
export async function getMyPosts(userId: string) {
  return prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
  });
}

/** 수정 화면용 — 본인 글만. */
export async function getMyPost(userId: string, postId: string) {
  return prisma.post.findFirst({
    where: { id: postId, authorId: userId },
    include: { tags: { include: { tag: true } } },
  });
}
