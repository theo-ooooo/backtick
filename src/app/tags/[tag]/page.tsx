import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toFeedItem, toExternalFeedItem, type FeedItem } from "@/lib/feed";
import { FeedItemRow } from "@/components/feed/FeedItemRow";

export const revalidate = 600;

export async function generateMetadata(props: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await props.params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage(props: PageProps<"/tags/[tag]">) {
  const { tag: raw } = await props.params;
  const tag = decodeURIComponent(raw).toLowerCase();

  const [externals, posts] = await Promise.all([
    prisma.externalPost.findMany({
      where: { tags: { has: tag } },
      orderBy: { publishedAt: "desc" },
      take: 40,
      include: { feed: true },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", tags: { some: { tag: { name: tag } } } },
      orderBy: { publishedAt: "desc" },
      take: 40,
      include: { author: true, tags: { include: { tag: true } } },
    }),
  ]);

  const items: FeedItem[] = [...posts.map(toFeedItem), ...externals.map(toExternalFeedItem)].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-10">
      <div className="border-b border-line pb-4">
        <h1 className="font-mono text-[22px] font-bold tracking-tight">
          <span className="text-acc">#</span>
          {tag}
        </h1>
        <p className="mt-1 text-[13.5px] font-medium text-muted">관련 글 {items.length}건</p>
      </div>
      <ul className="divide-y divide-line/70">
        {items.map((item) => (
          <li key={item.url}>
            <FeedItemRow item={item} />
          </li>
        ))}
        {items.length === 0 && <li className="py-20 text-center text-sm text-faint">이 태그의 글이 아직 없어요</li>}
      </ul>
    </main>
  );
}
