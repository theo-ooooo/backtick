"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  source?: string | null;
  url: string;
  summary: string | null;
  loading: boolean;
  error: boolean;
  /** 원문 이동 시 읽음 처리 */
  onRead?: () => void;
}

/** 피드 수집글 AI 요약 바텀시트 — 요약 확인 후 원문으로 이동 (앱 스타일, 댓글 시트와 동일 패턴). */
export function SummarySheet({ open, onClose, title, source, url, summary, loading, error, onRead }: Props) {
  // 시트 열림 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        style={{ animation: "btFadeIn .2s ease both" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82vh] w-full max-w-[560px] flex-col rounded-t-3xl bg-card shadow-[0_-12px_40px_rgba(26,24,21,.2)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        style={{ animation: "btSheetUp .3s cubic-bezier(.25,.8,.25,1) both" }}
      >
        <div className="flex items-center px-6 pb-1 pt-4">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden" />
          <span className="font-mono text-[12px] font-bold tracking-[0.12em] text-acc">✨ AI 요약</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1.5 text-[18px] leading-none text-muted transition hover:bg-paper hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          {source && <div className="font-mono text-[11.5px] font-semibold text-faint">{source}</div>}
          <h3 className="mt-1 text-[17px] font-extrabold leading-snug tracking-[-0.02em] text-ink">{title}</h3>

          <div className="mt-4 rounded-2xl bg-acc-soft/50 px-4 py-3.5">
            {loading ? (
              <div className="space-y-2.5 py-1">
                <div className="h-3 w-4/5 animate-pulse rounded bg-acc/15" />
                <div className="h-3 w-full animate-pulse rounded bg-acc/15" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-acc/15" />
              </div>
            ) : error ? (
              <p className="text-[13.5px] text-muted">요약을 만들지 못했어요. 원문으로 바로 이동해주세요.</p>
            ) : (
              <p className="whitespace-pre-line text-[14.5px] font-medium leading-[1.75] text-ink">{summary}</p>
            )}
          </div>
        </div>

        <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 sm:pb-6">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              onRead?.();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-acc py-3 text-[14.5px] font-bold text-white transition hover:opacity-90 active:scale-[.99]"
          >
            원문 읽으러 가기 <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
