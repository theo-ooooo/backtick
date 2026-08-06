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

  if (!HANDLE_RE.test(handle)) redirect("/settings?error=handle");
  const taken = await prisma.user.findFirst({ where: { handle, NOT: { id: me.id } } });
  if (taken) redirect("/settings?error=taken");

  await prisma.user.update({
    where: { id: me.id },
    data: { handle, name: name || me.name, bio: bio || null, githubUrl: githubUrl || null },
  });
  revalidatePath("/");
  redirect("/settings?saved=1");
}
