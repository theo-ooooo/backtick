"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleLike } from "@/lib/actions/post";

interface Props {
  postId: string;
  views: number;
  likeCount: number;
  liked: boolean;
  loggedIn: boolean;
}

const VIEW_KEY = "backtick_viewed";
const VIEW_TTL = 60 * 60 * 1000; // 같은 글 1시간 중복 방지

/** 글 하단 액션 바 — 좋아요 토글 + 조회수. 마운트 시 조회 비콘 1회. */
export function PostActions({ postId, views, likeCount, liked, loggedIn }: Props) {
  const [count, setCount] = useState(likeCount);
  const [isLiked, setIsLiked] = useState(liked);
  const [viewCount, setViewCount] = useState(views);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // 조회수 비콘 — 첫 방문은 증가(POST), 1시간 내 재방문은 조회만(GET). 응답으로 화면 즉시 갱신(ISR 캐시 무시)
  useEffect(() => {
    let dedup = false;
    try {
      const map = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}") as Record<string, number>;
      dedup = Date.now() - (map[postId] ?? 0) < VIEW_TTL;
      if (!dedup) {
        map[postId] = Date.now();
        localStorage.setItem(VIEW_KEY, JSON.stringify(map));
      }
    } catch {
      /* private 모드 등 — 그냥 집계 */
    }
    void fetch(`/api/posts/${postId}/view`, { method: dedup ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.views != null) setViewCount(j.views);
      })
      .catch(() => {});
  }, [postId]);

  function onLike() {
    if (!loggedIn) {
      window.location.href = "/login";
      return;
    }
    // 낙관적 반영
    setIsLiked((v) => !v);
    setCount((c) => c + (isLiked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(postId);
      if ("error" in res) {
        setIsLiked(liked);
        setCount(likeCount);
      } else {
        setIsLiked(res.liked);
        setCount(res.count);
      }
    });
  }

  async function onShare() {
    const url = window.location.href;
    const title = document.title;
    // 모바일은 네이티브 공유 시트, 데스크톱은 링크 복사
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* 사용자가 취소 — 아래 복사로 넘어가지 않음 */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 미지원 */
    }
  }

  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        type="button"
        onClick={onLike}
        disabled={pending}
        className={`flex items-center gap-2 rounded-full border px-4.5 py-2 text-[14px] font-bold transition ${
          isLiked
            ? "border-acc bg-acc-soft text-acc"
            : "border-line bg-white text-sub hover:border-acc hover:text-acc"
        }`}
      >
        {isLiked ? "♥" : "♡"} 좋아요 {count > 0 && count}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="flex items-center gap-2 rounded-full border border-line bg-white px-4.5 py-2 text-[14px] font-bold text-sub transition hover:border-acc hover:text-acc"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {copied ? "복사됨!" : "공유"}
      </button>
      <span className="ml-auto font-mono text-[12px] text-faint">조회 {viewCount.toLocaleString()}</span>
    </div>
  );
}
