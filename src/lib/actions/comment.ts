"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

async function revalidatePost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: true },
  });
  if (post?.author.handle) revalidatePath(`/@${post.author.handle}/${post.slug}`);
}

/**
 * 댓글/답글 작성.
 * 뎁스는 2로 고정: 답글의 답글은 같은 스레드 루트에 붙이고 replyToName으로 대상만 표시.
 */
export async function addComment(input: {
  postId: string;
  content: string;
  parentId?: string | null; // 답글 대상 댓글 id (루트든 답글이든)
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };

  const content = input.content.trim().slice(0, 1000);
  if (!content) return { ok: false, error: "내용을 입력해주세요" };

  let rootId: string | null = null;
  let replyToName: string | null = null;

  if (input.parentId) {
    const target = await prisma.comment.findUnique({
      where: { id: input.parentId },
      include: { author: true },
    });
    if (!target || target.postId !== input.postId) return { ok: false, error: "대상 댓글이 없어요" };
    // 답글의 답글이면 루트로 승격 + 대상 이름 기록
    rootId = target.parentId ?? target.id;
    replyToName = target.parentId ? (target.author.name ?? target.author.handle) : null;
  }

  await prisma.comment.create({
    data: { postId: input.postId, authorId: me.id, parentId: rootId, replyToName, content },
  });
  await revalidatePost(input.postId);
  return { ok: true };
}

/** 본인 댓글 soft delete — 답글 달린 스레드가 끊기지 않게. */
export async function deleteComment(commentId: string): Promise<{ ok: boolean }> {
  const me = await currentUser();
  if (!me) return { ok: false };
  const target = await prisma.comment.findFirst({ where: { id: commentId, authorId: me.id } });
  if (!target) return { ok: false };
  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  await revalidatePost(target.postId);
  return { ok: true };
}
