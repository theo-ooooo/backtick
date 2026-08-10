"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** 북마크 토글 — 백틱 글(native)·수집 글(external) 공용. */
export async function toggleBookmark(input: {
  kind: "native" | "external";
  id: string;
}): Promise<{ bookmarked: boolean } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: "로그인이 필요해요" };

  const where =
    input.kind === "native"
      ? { userId_postId: { userId: me.id, postId: input.id } }
      : { userId_externalPostId: { userId: me.id, externalPostId: input.id } };

  const existing = await prisma.bookmark.findUnique({ where } as never);
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({
    data: {
      userId: me.id,
      ...(input.kind === "native" ? { postId: input.id } : { externalPostId: input.id }),
    },
  });
  return { bookmarked: true };
}
