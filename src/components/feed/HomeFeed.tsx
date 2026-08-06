"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, FeedTab, FeedSort } from "@/lib/feed";
import { FeedList } from "./FeedList";
import { Spinner } from "@/components/ui/Spinner";
import { logoColor } from "@/lib/colors";

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
        <div className="scrollbar-none sticky top-[60px] z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-line/70 bg-white px-1 py-3.5">
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
            className="flex w-[64px] shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-full font-mono text-[19px] font-semibold transition ${
                selected.length === 0
                  ? "bg-ink text-acc ring-2 ring-ink ring-offset-2"
                  : "bg-paper text-sub opacity-80"
              }`}
            >
              `
            </span>
            <span className={`text-[11px] font-bold ${selected.length === 0 ? "text-ink" : "text-muted"}`}>전체</span>
          </button>
          {sourceNames.map((name) => {
            const on = selected.includes(name);
            return (
              <button key={name} type="button" onClick={() => toggleSource(name)} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
                <span className="relative flex">
                  <span
                    className={`flex h-[46px] w-[46px] items-center justify-center rounded-full text-[17px] font-extrabold text-white transition ${
                      on ? "ring-2 ring-acc ring-offset-2" : selected.length > 0 ? "opacity-35" : ""
                    }`}
                    style={{ background: logoColor(name) }}
                  >
                    {name.charAt(0)}
                  </span>
                  {on && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-[17px] w-[17px] items-center justify-center rounded-full bg-acc text-[10px] font-bold text-white ring-2 ring-white">
                      ✓
                    </span>
                  )}
                </span>
                <span className={`max-w-[64px] truncate text-[11px] font-bold ${on ? "text-acc" : "text-muted"}`}>
                  {name}
                </span>
              </button>
            );
          })}
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
