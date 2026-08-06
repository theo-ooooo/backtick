"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "backtick_read";
const MAX = 500; // 오래된 것부터 밀어내기
const EMPTY: ReadonlySet<string> = new Set();

// 모듈 레벨 외부 스토어 — 리스트 여러 개가 같은 읽음 상태를 공유한다.
let cache: Set<string> | null = null;
let synced = false; // 서버 병합은 세션당 1회
const listeners = new Set<() => void>();

function persist(set: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set].slice(-MAX)));
  } catch {
    /* storage full/denied — 표시만 포기 */
  }
}

function getSnapshot(): ReadonlySet<string> {
  if (cache === null) {
    try {
      const raw = localStorage.getItem(KEY);
      cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      cache = new Set();
    }
  }
  return cache;
}

// SSR/hydration 첫 렌더는 항상 "안 읽음"으로 — 서버 HTML과 일치
function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(): void {
  listeners.forEach((l) => l());
}

/** 로그인 상태면 서버 기록을 로컬과 병합 (기기 간 동기화). 401이면 조용히 로컬만. */
async function syncFromServer(): Promise<void> {
  if (synced) return;
  synced = true;
  try {
    const res = await fetch("/api/reads");
    if (!res.ok) return; // 비로그인(401) 등 — 로컬만 사용
    const { urls } = (await res.json()) as { urls: string[] };
    if (!urls?.length) return;
    const next = new Set(getSnapshot());
    let changed = false;
    for (const u of urls) {
      if (!next.has(u)) {
        next.add(u);
        changed = true;
      }
    }
    if (changed) {
      cache = next;
      persist(next);
      notify();
    }
  } catch {
    /* network — 로컬만 */
  }
}

function mark(url: string): void {
  const current = getSnapshot();
  if (!current.has(url)) {
    const next = new Set(current);
    next.add(url);
    cache = next;
    persist(next);
    notify();
  }
  // 로그인 상태면 서버에도 기록 (fire-and-forget, 401은 무시)
  void fetch("/api/reads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => {});
}

/** 읽은 글(url) 기록 — 비로그인=로컬, 로그인=로컬+서버 동기화(절충안). */
export function useReadPosts() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void syncFromServer();
  }, []);

  const isRead = useCallback((url: string) => read.has(url), [read]);
  return { isRead, markRead: mark };
}
