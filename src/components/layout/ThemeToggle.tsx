"use client";

import { useEffect, useState } from "react";

/** 라이트/다크 토글 — data-theme + localStorage(bt-theme). 초기값은 루트 인라인 스크립트가 세팅. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setDark(document.documentElement.dataset.theme === "dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "";
    try {
      localStorage.setItem("bt-theme", next ? "dark" : "light");
    } catch {
      /* private 모드 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "라이트 모드로" : "다크 모드로"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
