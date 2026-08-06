"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FeedSort } from "@/lib/feed";

/** 홈 피드 정렬 셀렉트 — 쿼리스트링(sort)으로 반영, 탭 유지. */
export function SortSelect({ current }: { current: FeedSort }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value === "latest") next.delete("sort");
        else next.set("sort", e.target.value);
        router.push(`/?${next.toString()}`);
      }}
      className="ml-auto cursor-pointer appearance-none rounded-lg border-0 bg-transparent pr-1 text-right text-[12.5px] font-semibold text-muted outline-none transition hover:text-ink"
      aria-label="정렬"
    >
      <option value="latest">최신순 ▾</option>
      <option value="popular">인기순 ▾</option>
    </select>
  );
}
