"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 40) || "team";
}

/** 팀 생성 — 생성자가 owner. 성공 시 팀 페이지로 이동. */
export async function createTeam(formData: FormData) {
  const me = await currentUser();
  if (!me) redirect("/login");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const description = String(formData.get("description") ?? "").trim().slice(0, 200) || null;
  if (!name) redirect("/teams?error=name");

  let slug = slugify(name);
  if (await prisma.team.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const team = await prisma.team.create({
    data: { name, slug, description, members: { create: { userId: me.id, role: "owner" } } },
  });
  redirect(`/teams/${team.slug}`);
}

/** 멤버 초대 — owner만, 핸들로 추가. */
export async function inviteMember(teamId: string, handle: string): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };
  const owner = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: me.id } } });
  if (owner?.role !== "owner") return { ok: false, error: "팀장만 초대할 수 있어요" };

  const target = await prisma.user.findUnique({ where: { handle: handle.trim().toLowerCase() }, select: { id: true } });
  if (!target) return { ok: false, error: "그 핸들의 사용자가 없어요" };
  if (target.id === me.id) return { ok: false, error: "이미 멤버예요" };

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: target.id } },
    update: {},
    create: { teamId, userId: target.id, role: "member" },
  });
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { slug: true } });
  if (team) revalidatePath(`/teams/${team.slug}`);
  return { ok: true };
}

/** 팀 이미지 변경 — owner만. Storage 업로드 후 URL 저장. */
export async function updateTeamImage(teamId: string, dataUrl: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };
  const owner = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: me.id } } });
  if (owner?.role !== "owner") return { ok: false, error: "팀장만 변경할 수 있어요" };

  const { uploadImage } = await import("@/lib/storage");
  const url = await uploadImage(dataUrl, `teams/${teamId}/logo-${Date.now().toString(36)}`);
  if (!url) return { ok: false, error: "업로드 실패" };
  await prisma.team.update({ where: { id: teamId }, data: { image: url } });
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { slug: true } });
  if (team) revalidatePath(`/teams/${team.slug}`);
  return { ok: true, url };
}
