import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** 내 알림 목록 + 안읽음 수 */
export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        actor: { select: { name: true, handle: true } },
        post: { select: { title: true, slug: true, author: { select: { handle: true } } } },
      },
    }),
    prisma.notification.count({ where: { userId: me.id, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      read: n.read,
      actor: n.actor.name ?? n.actor.handle ?? "누군가",
      postTitle: n.post.title,
      url: `/@${n.post.author.handle}/${encodeURIComponent(n.post.slug)}`,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

/** 전체 읽음 처리 */
export async function POST() {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
