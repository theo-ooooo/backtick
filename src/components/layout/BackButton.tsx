"use client";

import { useRouter } from "next/navigation";

/** 에디터 헤더의 뒤로가기 — 히스토리가 없으면 홈으로. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="뒤로가기"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-black/[.05] active:scale-95"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
