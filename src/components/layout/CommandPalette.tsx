"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  title: string;
  url: string;
  kind: "native" | "external";
  source: string | null;
}

const NAV = [
  { title: "홈 피드", url: "/", hint: "이동" },
  { title: "글쓰기", url: "/write", hint: "이동" },
  { title: "저장한 글", url: "/bookmarks", hint: "이동" },
  { title: "내 통계", url: "/stats", hint: "이동" },
  { title: "태그", url: "/tags", hint: "이동" },
  { title: "기업 블로그", url: "/sources", hint: "이동" },
  { title: "설정", url: "/settings", hint: "이동" },
];

/** ⌘K 커맨드 팔레트 — 어디서든 검색·이동. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 전역 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => inputRef.current?.focus());
    } else {
      queueMicrotask(() => {
        setQ("");
        setResults([]);
        setActive(0);
      });
    }
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (q.trim().length < 2) {
      queueMicrotask(() => setResults([]));
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/quick-search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { items?: Result[] } | null) => {
          if (j?.items) {
            setResults(j.items);
            setActive(0);
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const navItems = q.trim()
    ? NAV.filter((n) => n.title.toLowerCase().includes(q.trim().toLowerCase()))
    : NAV;
  const all = [...navItems.map((n) => ({ title: n.title, url: n.url, kind: "nav" as const, source: n.hint })), ...results];

  const go = useCallback(
    (item: { url: string; kind: string }) => {
      setOpen(false);
      if (item.kind === "external") window.open(item.url, "_blank", "noopener");
      else router.push(item.url);
    },
    [router],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "btFadeIn .15s ease both" }} />
      <div className="absolute left-1/2 top-[18vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_80px_rgba(26,24,21,.3)]">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-faint" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, all.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && all[active]) {
                go(all[active]);
              }
            }}
            placeholder="검색하거나 이동할 곳을 입력하세요…"
            className="w-full bg-transparent py-3.5 text-[14.5px] font-medium outline-none placeholder:text-faint"
          />
          <kbd className="shrink-0 rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[10.5px] text-faint">ESC</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {all.length === 0 && <p className="px-3.5 py-8 text-center text-[13px] text-faint">결과가 없어요</p>}
          {all.map((item, i) => (
            <button
              key={`${item.kind}-${item.url}`}
              type="button"
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left transition ${
                i === active ? "bg-paper" : ""
              }`}
            >
              <span className={`shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide ${item.kind === "nav" ? "text-acc" : "text-faint"}`}>
                {item.kind === "nav" ? "GO" : item.kind === "external" ? "수집" : "백틱"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{item.title}</span>
              {item.source && <span className="shrink-0 text-[11.5px] text-faint">{item.source}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
