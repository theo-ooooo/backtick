import { prisma } from "@/lib/prisma";
import { imgProxy } from "@/lib/img";

export interface CommentView {
  id: string;
  authorName: string;
  authorHandle: string | null;
  authorImage: string | null;
  authorId: string;
  replyToName: string | null;
  content: string;
  deleted: boolean;
  createdAt: Date;
  replies: CommentView[];
}

/** 글의 댓글 — 2뎁스 고정(스레드 루트 + 답글들, 답글은 replyToName으로 대상 표시). */
export async function getComments(postId: string): Promise<CommentView[]> {
  const rows = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });

  const toView = (r: (typeof rows)[number]): CommentView => ({
    id: r.id,
    authorName: r.author.name ?? r.author.handle ?? "익명",
    authorHandle: r.author.handle,
    authorImage: r.author.image,
    authorId: r.authorId,
    replyToName: r.replyToName,
    content: r.deletedAt ? "" : r.content,
    deleted: Boolean(r.deletedAt),
    createdAt: r.createdAt,
    replies: [],
  });

  const roots = new Map<string, CommentView>();
  const result: CommentView[] = [];
  for (const r of rows) {
    if (!r.parentId) {
      const v = toView(r);
      roots.set(r.id, v);
      result.push(v);
    }
  }
  for (const r of rows) {
    if (r.parentId) {
      const root = roots.get(r.parentId);
      if (root) root.replies.push(toView(r));
    }
  }
  // 삭제된 루트 중 답글 없는 것은 숨김
  return result.filter((c) => !c.deleted || c.replies.length > 0);
}

export async function countComments(postId: string): Promise<number> {
  return prisma.comment.count({ where: { postId, deletedAt: null } });
}
