"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

const HANDLE_RE = /^[a-z0-9-]{3,20}$/;

/** 프로필 저장 — 핸들 형식/중복 검증 포함. */
export async function saveProfile(formData: FormData) {
  const me = await currentUser();
  if (!me) redirect("/login");

  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 180);
  const githubUrl = String(formData.get("githubUrl") ?? "").trim().slice(0, 120);
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim().slice(0, 200);
  const publicEmail = String(formData.get("publicEmail") ?? "").trim().slice(0, 120);
  if (publicEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(publicEmail)) redirect("/settings?error=email");

  if (!HANDLE_RE.test(handle)) redirect("/settings?error=handle");
  const taken = await prisma.user.findFirst({ where: { handle, NOT: { id: me.id } } });
  if (taken) redirect("/settings?error=taken");

  await prisma.user.update({
    where: { id: me.id },
    data: {
      handle,
      name: name || me.name,
      bio: bio || null,
      githubUrl: githubUrl || null,
      websiteUrl: websiteUrl || null,
      publicEmail: publicEmail || null,
    },
  });
  revalidatePath("/");
  redirect("/settings?saved=1");
}

const DATA_URL_RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const MAX_DATA_URL = 400_000; // ~300KB binary — 256px 아바타면 충분

/** 프로필 이미지 저장 — 클라이언트에서 리사이즈된 data URL을 받는다. null이면 기본 이미지로. */
export async function updateAvatar(dataUrl: string | null): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };

  if (dataUrl !== null) {
    if (!DATA_URL_RE.test(dataUrl)) return { ok: false, error: "지원하지 않는 이미지 형식이에요" };
    if (dataUrl.length > MAX_DATA_URL) return { ok: false, error: "이미지가 너무 커요" };
  }

  await prisma.user.update({ where: { id: me.id }, data: { image: dataUrl } });
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
