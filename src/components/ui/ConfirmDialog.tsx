"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** 브랜드 스타일 확인 모달 — 네이티브 confirm() 대체. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        style={{ animation: "btFadeIn .18s ease both" }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-[340px] rounded-2xl bg-card p-6 shadow-[0_16px_48px_rgba(26,24,21,.25)]"
        style={{ animation: "btPop .22s cubic-bezier(.25,.8,.3,1.2) both" }}
      >
        <h3 className="text-[16.5px] font-extrabold tracking-tight">{title}</h3>
        {message && <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">{message}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl border border-line bg-card py-2.5 text-[14px] font-bold text-sub transition hover:bg-paper"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`flex-1 rounded-xl py-2.5 text-[14px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 ${
              danger ? "bg-acc" : "bg-ink"
            }`}
          >
            {pending ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
