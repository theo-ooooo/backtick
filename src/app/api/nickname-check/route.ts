import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** 닉네임 실시간 중복 확인 — ?n=닉네임 (본인 닉네임은 사용 가능 처리) */
export async function GET(req: Request) {
  const n = new URL(req.url).searchParams.get("n")?.trim() ?? "";
  if (!n || n.length > 40) return NextResponse.json({ available: false, invalid: true });

  const me = await currentUser();
  const owner = await prisma.user.findFirst({ where: { name: n }, select: { id: true } });
  return NextResponse.json({ available: !owner || owner.id === me?.id });
}
