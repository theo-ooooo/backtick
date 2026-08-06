import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 조회수 비콘 — 클라이언트가 글 진입 시 1회 호출(로컬 중복 방지는 클라 담당). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  } catch {
    // 없는 글이어도 조용히 — 비콘은 실패해도 UX에 영향 없음
  }
  return NextResponse.json({ ok: true });
}
