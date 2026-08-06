"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base || "post";
}

/** 본문 첫 마크다운 이미지를 카드 썸네일로 쓴다. */
function firstImage(md: string): string | null {
  const m = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)/.exec(md);
  return m ? m[1] : null;
}

function toExcerpt(md: string, max = 160): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function upsertTags(postId: string, raw: string) {
  const names = [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && t.length <= 24),
    ),
  ].slice(0, 5);

  await prisma.postTag.deleteMany({ where: { postId } });
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug: encodeURIComponent(name.replace(/\s+/g, "-")) },
    });
    await prisma.postTag.create({ data: { postId, tagId: tag.id } });
  }
}

/** 글 삭제 — 본인 글만. 태그연결·좋아요·댓글은 FK cascade로 함께 정리된다. */
export async function deletePost(postId: string): Promise<{ ok: boolean; error?: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "로그인이 필요해요" };
  const post = await prisma.post.findFirst({ where: { id: postId, authorId: me.id } });
  if (!post) return { ok: false, error: "글을 찾을 수 없어요" };
  await prisma.post.delete({ where: { id: postId } });
  revalidatePath("/");
  if (me.handle) revalidatePath(`/@${me.handle}`);
  return { ok: true };
}

/** 좋아요 토글 — 로그인 유저만. 결과 상태를 돌려준다. */
export async function toggleLike(postId: string): Promise<{ liked: boolean; count: number } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: "로그인이 필요해요" };

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: me.id } },
  });
  if (existing) {
    await prisma.postLike.delete({ where: { postId_userId: { postId, userId: me.id } } });
  } else {
    await prisma.postLike.create({ data: { postId, userId: me.id } });
  }
  const count = await prisma.postLike.count({ where: { postId } });
  revalidatePath("/");
  return { liked: !existing, count };
}

/** Save (draft) or publish a post. Shared by /write and /write/[id]. */
export async function savePost(formData: FormData) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!me.handle) redirect("/settings?error=handle");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 150);
  const content = String(formData.get("content") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const publish = formData.get("action") === "publish";
  if (!title) redirect(id ? `/write/${id}?error=title` : "/write?error=title");

  let post;
  if (id) {
    post = await prisma.post.findFirst({ where: { id, authorId: me.id } });
    if (!post) redirect("/write");
    post = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        excerpt: toExcerpt(content),
        coverImage: firstImage(content),
        ...(publish && post.status === "DRAFT"
          ? { status: "PUBLISHED", publishedAt: new Date() }
          : {}),
      },
    });
  } else {
    // unique slug per author: append a short suffix on collision
    let slug = slugify(title);
    const dupe = await prisma.post.findFirst({ where: { authorId: me.id, slug } });
    if (dupe) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    post = await prisma.post.create({
      data: {
        authorId: me.id,
        title,
        slug,
        content,
        excerpt: toExcerpt(content),
        coverImage: firstImage(content),
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  await upsertTags(post.id, tagsRaw);
  revalidatePath("/");
  if (publish || post.status === "PUBLISHED") {
    revalidatePath(`/@${me.handle}`);
    redirect(`/@${me.handle}/${post.slug}`);
  }
  redirect(`/write/${post.id}?saved=1`);
}
