import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

const HANDLE_RE = /^[a-z0-9-]{3,20}$/;

/** 핸들 실시간 중복 확인 — ?h=my-handle */
export async function GET(req: Request) {
  const h = new URL(req.url).searchParams.get("h")?.trim().toLowerCase() ?? "";
  if (!HANDLE_RE.test(h)) return NextResponse.json({ available: false, invalid: true });

  const [me, owner] = await Promise.all([currentUser(), prisma.user.findUnique({ where: { handle: h } })]);
  return NextResponse.json({ available: !owner || owner.id === me?.id });
}
