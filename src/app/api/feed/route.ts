import { NextResponse } from "next/server";
import { getFeed, type FeedTab, type FeedSort } from "@/lib/feed";

/** 무한스크롤용 피드 페이지 — /api/feed?tab=&sort=&page=&sources=a,b */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawTab = url.searchParams.get("tab");
  const tab: FeedTab = rawTab === "backtick" || rawTab === "tech" ? rawTab : "all";
  const sort: FeedSort = url.searchParams.get("sort") === "popular" ? "popular" : "latest";
  const page = Math.max(0, Math.min(50, Number(url.searchParams.get("page") ?? 0) || 0));
  const sources = url.searchParams.get("sources")?.split(",").map((s) => s.trim()).filter(Boolean);

  const items = await getFeed(tab, sort, page, 20, sources);
  return NextResponse.json({ items });
}
