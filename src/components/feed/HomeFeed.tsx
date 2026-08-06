"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, FeedTab, FeedSort } from "@/lib/feed";
import { FeedList } from "./FeedList";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  initialItems: FeedItem[];
  tab: FeedTab;
  sort: FeedSort;
  sourceNames: string[]; // 필터 칩에 보여줄 수집 소스 목록
}

const PAGE_SIZE = 20;
const FILTER_KEY = "backtick_sources";

/** JSON 응답의 publishedAt(문자열) → Date 복원 */
function revive(items: (Omit<FeedItem, "publishedAt"> & { publishedAt: string })[]): FeedItem[] {
  return items.map((i) => ({ ...i, publishedAt: new Date(i.publishedAt) }));
}

function loadFilter(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** 홈 피드 — 무한스크롤 + 기술블로그 소스 필터(로컬 저장). */
export function HomeFeed({ initialItems, tab, sort, sourceNames }: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(initialItems.length < PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNo: number, sources: string[], replace = false) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ tab, sort, page: String(pageNo) });
        if (sources.length) qs.set("sources", sources.join(","));
        const res = await fetch(`/api/feed?${qs.toString()}`);
        const { items: raw } = (await res.json()) as { items: (Omit<FeedItem, "publishedAt"> & { publishedAt: string })[] };
        const next = revive(raw);
        setItems((prev) => {
          const base = replace ? [] : prev;
          const seen = new Set(base.map((i) => i.url));
          return [...base, ...next.filter((i) => !seen.has(i.url))];
        });
        setPage(pageNo);
        setDone(next.length < PAGE_SIZE);
      } finally {
        setLoading(false);
      }
    },
    [tab, sort],
  );

  // 저장된 소스 필터 적용 (있을 때만 재조회)
  useEffect(() => {
    const saved = loadFilter();
    if (saved.length) {
      setSelected(saved);
      void fetchPage(0, saved, true);
    }
  }, [fetchPage]);

  // 무한스크롤 sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) void fetchPage(page + 1, selected);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, loading, page, selected, fetchPage]);

  function toggleSource(name: string) {
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name];
    setSelected(next);
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    void fetchPage(0, next, true);
  }

  const showFilter = tab !== "backtick" && sourceNames.length > 0;

  return (
    <>
      {showFilter && (
        <div className="flex flex-wrap gap-1.5 border-b border-line/70 py-3">
          <button
            type="button"
            onClick={() => {
              setSelected([]);
              try {
                localStorage.setItem(FILTER_KEY, "[]");
              } catch {
                /* ignore */
              }
              void fetchPage(0, [], true);
            }}
            className={`rounded-full px-3 py-1 font-mono text-[12px] font-semibold transition ${
              selected.length === 0 ? "bg-ink text-white" : "border border-line text-sub hover:border-ink"
            }`}
          >
            전체
          </button>
          {sourceNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleSource(name)}
              className={`rounded-full px-3 py-1 font-mono text-[12px] font-semibold transition ${
                selected.includes(name) ? "bg-acc text-white" : "border border-line text-sub hover:border-acc hover:text-acc"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <FeedList items={items} />

      {!done && <div ref={sentinelRef} className="h-2" />}
      {loading && (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      )}
      {done && items.length > 0 && (
        <p className="py-8 text-center font-mono text-[11.5px] text-faint">끝까지 다 봤어요</p>
      )}
    </>
  );
}
