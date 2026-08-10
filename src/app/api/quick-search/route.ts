import { NextResponse } from "next/server";
import { searchAll } from "@/lib/queries/search";

/** ⌘K 팔레트용 빠른 검색 — 상위 8건만. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const items = await searchAll(q, 8);
  return NextResponse.json(
    {
      items: items.slice(0, 8).map((i) => ({
        title: i.title,
        url: i.url,
        kind: i.kind,
        source: i.source ?? i.author,
      })),
    },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
