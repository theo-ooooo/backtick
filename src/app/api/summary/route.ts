import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSummary, fetchArticleText } from "@/lib/ai/summary";

export const maxDuration = 60;

/** AI 3줄 요약 — 캐시 우선, 없으면 생성 후 저장. body: { kind: "native"|"external", url } */
export async function POST(req: Request) {
  const { kind, url } = (await req.json().catch(() => ({}))) as { kind?: string; url?: string };
  if (!url || (kind !== "native" && kind !== "external")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (kind === "external") {
    const post = await prisma.externalPost.findUnique({ where: { url } });
    if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (post.summary) return NextResponse.json({ summary: post.summary, cached: true });

    const text = (await fetchArticleText(post.url)) ?? post.excerpt ?? "";
    if (text.length < 100) return NextResponse.json({ error: "원문을 불러올 수 없어요" }, { status: 422 });
    const summary = await generateSummary(post.title, text);
    if (!summary) return NextResponse.json({ error: "요약 생성에 실패했어요" }, { status: 502 });
    await prisma.externalPost.update({ where: { url }, data: { summary } });
    return NextResponse.json({ summary });
  }

  // native: url = /@handle/slug
  const m = /^\/@([^/]+)\/(.+)$/.exec(url);
  if (!m) return NextResponse.json({ error: "bad url" }, { status: 400 });
  const author = await prisma.user.findUnique({ where: { handle: m[1].toLowerCase() } });
  if (!author) return NextResponse.json({ error: "not found" }, { status: 404 });
  const post = await prisma.post.findFirst({
    where: { authorId: author.id, slug: decodeURIComponent(m[2]), status: "PUBLISHED" },
  });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (post.summary) return NextResponse.json({ summary: post.summary, cached: true });

  const summary = await generateSummary(post.title, post.content);
  if (!summary) return NextResponse.json({ error: "요약 생성에 실패했어요" }, { status: 502 });
  await prisma.post.update({ where: { id: post.id }, data: { summary } });
  return NextResponse.json({ summary });
}
