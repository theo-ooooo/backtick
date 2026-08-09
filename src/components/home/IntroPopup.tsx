"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "backtick_intro_hide_until";
const DAY = 24 * 60 * 60 * 1000;

/** 백틱 소개 팝업 — 하루 1회 노출, "일주일 보지 않기" 지원. */
export function IntroPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const hideUntil = Number(localStorage.getItem(KEY) ?? 0);
        if (Date.now() > hideUntil) setOpen(true);
      } catch {
        /* ignore */
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  function close(days: number) {
    try {
      localStorage.setItem(KEY, String(Date.now() + days * DAY));
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="닫기"
        onClick={() => close(1)}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: "btFadeIn .2s ease both" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[400px] overflow-hidden rounded-3xl bg-card shadow-[0_20px_60px_rgba(26,24,21,.3)]"
        style={{ animation: "btPop .26s cubic-bezier(.25,.8,.3,1.15) both" }}
      >
        {/* 다크 헤더 — 브랜드 */}
        <div className="flex flex-col items-center bg-[#1a1815] px-8 pb-7 pt-9 text-center">
          <span className="font-mono text-[42px] font-semibold leading-none text-acc">`</span>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-tight text-white">백틱에 오신 걸 환영해요</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#b5aea6]">
            코드를 감싸는 기호처럼,
            <br />
            당신의 기록을 감싸는 곳
          </p>
        </div>

        <div className="px-7 py-6">
          <ul className="space-y-3 text-[13.5px] font-medium leading-relaxed text-sub">
            <li className="flex gap-2.5">
              <span className="shrink-0 font-mono font-bold text-acc">01</span>
              <span>
                토스·카카오·우아한형제들 등 <b className="text-ink">기술블로그 글을 한곳에서</b> 모아 봐요
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 font-mono font-bold text-acc">02</span>
              <span>
                GitHub 로그인 한 번이면 <b className="text-ink">내 블로그</b>가 생겨요
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 font-mono font-bold text-acc">03</span>
              <span>
                마크다운 에디터와 <b className="text-ink">다크 코드블록</b>으로 기술 글쓰기에 최적화
              </span>
            </li>
          </ul>

          <Link
            href="/login"
            onClick={() => close(7)}
            className="mt-6 block rounded-xl bg-ink py-3 text-center text-[14.5px] font-bold text-white transition hover:opacity-85"
          >
            시작하기
          </Link>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => close(7)}
              className="text-[12px] font-semibold text-faint transition hover:text-sub"
            >
              일주일 동안 보지 않기
            </button>
            <button
              type="button"
              onClick={() => close(1)}
              className="rounded-full border border-line px-4 py-1.5 text-[12.5px] font-bold text-sub transition hover:border-ink"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
