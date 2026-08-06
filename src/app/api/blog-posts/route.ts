import { NextResponse } from "next/server";
import { getBlogPostsPage } from "@/lib/queries/user";

/** 블로그(@핸들) 글 무한스크롤 — ?handle=theo&page=1 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle") ?? "";
  const page = Math.max(0, Number(searchParams.get("page") ?? 0) || 0);
  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 });

  const posts = await getBlogPostsPage(handle, page);
  if (!posts) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    items: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      date: (p.publishedAt ?? p.createdAt).toISOString(),
      tags: p.tags.map((t) => t.tag.name),
    })),
  });
}
