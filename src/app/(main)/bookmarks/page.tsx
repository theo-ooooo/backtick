import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getBookmarkedItems } from "@/lib/queries/bookmark";
import { FeedList } from "@/components/feed/FeedList";

export const metadata: Metadata = { title: "저장한 글", robots: { index: false } };

/** 저장함 — 북마크한 백틱 글·수집 글 목록. */
export default async function BookmarksPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  const items = await getBookmarkedItems(me.id);

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">저장한 글</h1>
      <p className="mt-1 text-[13.5px] text-muted">북마크 아이콘으로 저장한 글 {items.length}개</p>
      <div className="mt-4">
        <FeedList items={items} empty="아직 저장한 글이 없어요. 피드에서 🔖 아이콘을 눌러 저장해보세요" />
      </div>
    </main>
  );
}
