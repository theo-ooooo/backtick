import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** 조회수 비콘 — 방문 시 1회 증가시키고 현재 값을 돌려준다(화면 실시간 반영용). */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const post = await prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return NextResponse.json({ ok: true, views: post.views });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}

/** 증가 없이 현재 조회수만 (1시간 중복 방지에 걸린 재방문용). */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id }, select: { views: true } });
  if (!post) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, views: post.views });
}
