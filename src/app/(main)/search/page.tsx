import type { Metadata } from "next";
import { searchAll } from "@/lib/queries/search";
import { FeedList } from "@/components/feed/FeedList";

export const metadata: Metadata = { title: "검색" };

export default async function SearchPage(props: PageProps<"/search">) {
  const { q: rawQ } = await props.searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim() ?? "";
  const items = q ? await searchAll(q) : [];

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-8">
      <form action="/search" className="relative mb-6">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-faint">⌕</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="제목·내용 검색"
          autoComplete="off"
          autoFocus={!q}
          className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] font-medium outline-none placeholder:text-faint focus:border-acc"
        />
      </form>
      <section>
        {q ? (
          <>
            <div className="border-b border-line pb-4 text-[15px]">
              <span className="font-extrabold text-acc">{q}</span>
              <span className="ml-2 font-semibold text-muted">검색 결과 {items.length}건</span>
            </div>
            <FeedList items={items} empty="검색 결과가 없어요" />
          </>
        ) : (
          <div className="py-20 text-center text-sm text-faint">검색어를 입력해주세요</div>
        )}
      </section>
    </main>
  );
}
