"use client";

import { useEffect, useState } from "react";
import type { CommentView } from "@/lib/queries/comment";
import { Comments } from "./Comments";

interface Props {
  postId: string;
  comments: CommentView[];
  count: number;
  meId: string | null;
}

/** 우하단 픽스드 댓글 버튼 → 아래에서 올라오는 바텀시트 (앱 스타일). */
export function CommentsSheet(props: Props) {
  const [open, setOpen] = useState(false);

  // 시트 열림 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* floating action button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(26,24,21,.35)] transition hover:opacity-90 active:scale-95"
        aria-label="댓글 열기"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2 3.5C2 2.7 2.7 2 3.5 2h9c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H6l-3 3v-3h.5A1.5 1.5 0 0 1 2 9.5v-6Z"
            fill="currentColor"
            opacity=".9"
          />
        </svg>
        댓글 {props.count > 0 && <span className="text-acc-soft">{props.count}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            style={{ animation: "btFadeIn .2s ease both" }}
          />
          {/* sheet */}
          <div
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82vh] w-full max-w-[720px] flex-col rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(26,24,21,.2)]"
            style={{ animation: "btSheetUp .3s cubic-bezier(.25,.8,.25,1) both" }}
          >
            <div className="flex items-center border-b border-line px-6 pb-3 pt-3">
              <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
              <span className="mt-2 text-[15px] font-extrabold">
                댓글 <span className="text-acc">{props.count}</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto mt-2 rounded-full p-1.5 text-[18px] leading-none text-muted transition hover:bg-paper hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
              <Comments {...props} hideHeading />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
