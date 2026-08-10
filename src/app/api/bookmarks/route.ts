import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** 내 북마크 id 목록 — 피드에서 저장 상태 표시용 (개인화라 캐시 없음). */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ ids: [] });
  const rows = await prisma.bookmark.findMany({
    where: { userId: me.id },
    select: { postId: true, externalPostId: true },
  });
  return NextResponse.json({ ids: rows.map((r) => r.postId ?? r.externalPostId).filter(Boolean) });
}
