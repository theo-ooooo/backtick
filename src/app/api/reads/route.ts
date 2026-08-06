import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 로그인 유저의 읽음 목록 — 클라이언트 로컬 기록과 병합용. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ urls: [] }, { status: 401 });

  const rows = await prisma.readItem.findMany({
    where: { userId },
    orderBy: { readAt: "desc" },
    take: 500,
    select: { url: true },
  });
  return NextResponse.json({ urls: rows.map((r) => r.url) });
}

/** 읽음 기록 저장 (멱등 upsert). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || url.length > 500) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.readItem.upsert({
    where: { userId_url: { userId, url } },
    update: {},
    create: { userId, url },
  });
  return NextResponse.json({ ok: true });
}
