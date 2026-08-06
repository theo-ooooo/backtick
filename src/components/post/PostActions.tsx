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
  const [pending, startTransition] = useTransition();

  // 조회수 비콘 (localStorage로 1시간 중복 방지)
  useEffect(() => {
    try {
      const map = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}") as Record<string, number>;
      const last = map[postId] ?? 0;
      if (Date.now() - last < VIEW_TTL) return;
      map[postId] = Date.now();
      localStorage.setItem(VIEW_KEY, JSON.stringify(map));
    } catch {
      /* private 모드 등 — 그냥 집계 */
    }
    void fetch(`/api/posts/${postId}/view`, { method: "POST" });
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

  return (
    <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
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
      <span className="ml-auto font-mono text-[12px] text-faint">조회 {views.toLocaleString()}</span>
    </div>
  );
}
