"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 60) || "series";
}

/** 컬렉션 생성 후 id 반환 — 에디터에서 새 시리즈 만들 때. */
export async function createCollection(name: string): Promise<{ id: string; name: string } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: "로그인이 필요해요" };
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { error: "이름을 입력해주세요" };
  let slug = slugify(trimmed);
  if (await prisma.collection.findFirst({ where: { userId: me.id, slug } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  const c = await prisma.collection.create({ data: { userId: me.id, name: trimmed, slug } });
  return { id: c.id, name: c.name };
}

/** 내 컬렉션 목록 — 에디터 셀렉트용. */
export async function myCollections(): Promise<{ id: string; name: string }[]> {
  const me = await currentUser();
  if (!me) return [];
  return prisma.collection.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } });
}
