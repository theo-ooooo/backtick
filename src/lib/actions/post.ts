"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { uploadImage, adoptInlineImages } from "@/lib/storage";
import { notify } from "@/lib/notify";

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
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post) await notify({ userId: post.authorId, actorId: me.id, type: "like", postId });
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
  const rawCover = String(formData.get("coverImage") ?? "").trim();
  const coverValid =
    (/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(rawCover) && rawCover.length <= 400_000) ||
    /^https:\/\/.+/.test(rawCover);
  const uploadedCover = coverValid ? rawCover : null;
  // data URL 커버는 글 id가 정해진 뒤 posts/{id}/ 경로로 업로드한다 (아래에서)
  const coverForSave = uploadedCover?.startsWith("data:") ? undefined : (uploadedCover ?? undefined);
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
        coverImage: coverForSave ?? firstImage(content),
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
        coverImage: coverForSave ?? firstImage(content),
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  // 유저 폴더에 임시로 올라간 본문 이미지를 글 폴더로 입양 (이 경로는 리다이렉트→리로드라 URL 교체 안전)
  const adopted = await adoptInlineImages(post.content, me.id, post.id);
  if (adopted !== post.content) {
    post = await prisma.post.update({ where: { id: post.id }, data: { content: adopted } });
  }

  // 새 커버(data URL)는 이제 id가 있으니 posts/{id}/ 경로로 Storage 업로드 → URL 저장
  if (uploadedCover?.startsWith("data:")) {
    const url = await uploadImage(uploadedCover, `posts/${post.id}/cover-${Date.now().toString(36)}`);
    // 업로드 실패 시 data URL이라도 저장 — /api/img 프록시가 서빙해준다
    post = await prisma.post.update({ where: { id: post.id }, data: { coverImage: url ?? uploadedCover } });
  }

  await upsertTags(post.id, tagsRaw);
  revalidatePath("/");
  if (publish || post.status === "PUBLISHED") {
    revalidatePath(`/@${me.handle}`);
    // redirect는 HTTP 헤더를 타므로 한글 슬러그는 반드시 인코딩 (ERR_INVALID_CHAR 방지)
    redirect(`/@${me.handle}/${encodeURIComponent(post.slug)}`);
  }
  redirect(`/write/${post.id}?saved=1`);
}

/** 에디터 자동 저장 — 초안만. 새 글이면 DRAFT 생성 후 id 반환. redirect 없음. */
export async function autosaveDraft(input: {
  id?: string;
  title: string;
  content: string;
}): Promise<{ id: string; savedAt: string } | { error: string }> {
  const me = await currentUser();
  if (!me) return { error: "로그인이 필요해요" };

  const title = input.title.trim().slice(0, 150);
  if (!title) return { error: "제목 없음" };
  const content = input.content;

  if (input.id) {
    const post = await prisma.post.findFirst({ where: { id: input.id, authorId: me.id } });
    if (!post) return { error: "글을 찾을 수 없어요" };
    // 발행된 글은 자동 저장하지 않는다 — 수정 중 내용이 라이브에 새어나가면 안 됨
    if (post.status !== "DRAFT") return { error: "published" };
    await prisma.post.update({
      where: { id: post.id },
      data: { title, content, excerpt: toExcerpt(content) },
    });
    return { id: post.id, savedAt: new Date().toISOString() };
  }

  let slug = slugify(title);
  const dupe = await prisma.post.findFirst({ where: { authorId: me.id, slug } });
  if (dupe) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const post = await prisma.post.create({
    data: { authorId: me.id, title, slug, content, excerpt: toExcerpt(content), status: "DRAFT" },
  });
  return { id: post.id, savedAt: new Date().toISOString() };
}
