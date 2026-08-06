"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** 기술블로그 추가 요청 — DB에 쌓아두고 어드민이 확인 후 수동 등록. */
export async function requestFeed(input: {
  name: string;
  url: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };

  const name = input.name.trim().slice(0, 60);
  const url = input.url.trim().slice(0, 300);
  if (!name) return { ok: false, error: "블로그 이름을 입력해주세요" };
  if (!/^https?:\/\/.+\..+/.test(url)) return { ok: false, error: "주소 형식을 확인해주세요 (https://…)" };

  // 같은 사람이 같은 주소를 연타로 넣는 것만 가볍게 방지
  const dup = await prisma.feedRequest.findFirst({ where: { url, requesterId: me.id } });
  if (dup) return { ok: false, error: "이미 요청한 주소예요" };

  await prisma.feedRequest.create({ data: { name, url, requesterId: me.id } });
  return { ok: true };
}
