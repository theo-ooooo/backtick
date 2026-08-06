"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "backtick_read";
const MAX = 500; // 오래된 것부터 밀어내기
const EMPTY: ReadonlySet<string> = new Set();

// 모듈 레벨 외부 스토어 — 리스트 여러 개가 같은 읽음 상태를 공유한다.
let cache: Set<string> | null = null;
const listeners = new Set<() => void>();

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

function mark(url: string): void {
  const current = getSnapshot();
  if (current.has(url)) return;
  const next = new Set(current);
  next.add(url);
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next].slice(-MAX)));
  } catch {
    /* storage full/denied — 표시만 포기 */
  }
  listeners.forEach((l) => l());
}

/** 읽은 글(url) 로컬 기록 — 계정 없이도 동작, 기기 단위. */
export function useReadPosts() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isRead = useCallback((url: string) => read.has(url), [read]);
  return { isRead, markRead: mark };
}
