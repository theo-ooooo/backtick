"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FeedSort } from "@/lib/feed";

const OPTIONS: { key: FeedSort; label: string }[] = [
  { key: "latest", label: "최신" },
  { key: "popular", label: "트렌딩" },
];

/** 홈 피드 정렬 — 최신/트렌딩 세그먼트 탭. 쿼리스트링(sort)으로 반영, 탭 유지. */
export function SortSelect({ current }: { current: FeedSort }) {
  const router = useRouter();
  const params = useSearchParams();

  function go(sort: FeedSort) {
    const next = new URLSearchParams(params.toString());
    if (sort === "latest") next.delete("sort");
    else next.set("sort", sort);
    router.push(`/?${next.toString()}`);
  }

  return (
    <div className="ml-auto flex items-center gap-0.5 rounded-full bg-paper p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => go(o.key)}
          className={`rounded-full px-3 py-1 text-[12.5px] font-bold transition ${
            current === o.key ? "bg-card text-ink shadow-sm" : "text-muted hover:text-sub"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
