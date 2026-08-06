import type { Metadata } from "next";
import { getTagFeed } from "@/lib/queries/tag";
import { FeedList } from "@/components/feed/FeedList";

export const revalidate = 600;

export async function generateMetadata(props: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await props.params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage(props: PageProps<"/tags/[tag]">) {
  const { tag: raw } = await props.params;
  const tag = decodeURIComponent(raw).toLowerCase();

  const items = await getTagFeed(tag);

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-10">
      <div className="border-b border-line pb-4">
        <h1 className="font-mono text-[22px] font-bold tracking-tight">
          <span className="text-acc">#</span>
          {tag}
        </h1>
        <p className="mt-1 text-[13.5px] font-medium text-muted">관련 글 {items.length}건</p>
      </div>
      <FeedList items={items} empty="이 태그의 글이 아직 없어요" />
    </main>
  );
}
