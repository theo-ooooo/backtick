"use client";

import { useCallback, useEffect, useState } from "react";
import { toggleBookmark } from "@/lib/actions/bookmark";

/** 내 북마크 상태 — 마운트 시 1회 로드, 낙관적 토글. 비로그인은 /login 이동. */
export function useBookmarks() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ids?: string[] } | null) => {
        if (j?.ids) setIds(new Set(j.ids));
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((kind: "native" | "external", id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    void toggleBookmark({ kind, id }).then((res) => {
      if ("error" in res) {
        window.location.href = "/login";
      }
    });
  }, []);

  return { isBookmarked: (id: string) => ids.has(id), toggle };
}
