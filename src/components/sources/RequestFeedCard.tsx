"use client";

import { useState, useTransition } from "react";
import { requestFeed } from "@/lib/actions/feed";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/** 소스 그리드의 "블로그 추가 요청" 카드 — 클릭 시 요청 모달. */
export function RequestFeedCard({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await requestFeed({ name, url });
      if (!res.ok) setError(res.error);
      else setSent(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (loggedIn ? setOpen(true) : (window.location.href = "/login"))}
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-faint/60 p-5 text-center transition hover:border-acc"
      >
        <span className="font-mono text-[18px] text-faint">`</span>
        <div className="mt-1 text-[14px] font-bold text-sub">블로그 추가 요청</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          수집되었으면 하는 기술블로그를
          <br />
          알려주세요
        </p>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            style={{ animation: "btFadeIn .18s ease both" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-[0_16px_48px_rgba(26,24,21,.25)]"
            style={{ animation: "btPop .22s cubic-bezier(.25,.8,.3,1.2) both" }}
          >
            {sent ? (
              <div className="py-4 text-center">
                <div className="text-[28px]">✅</div>
                <h3 className="mt-2 text-[16.5px] font-extrabold">요청 받았어요!</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  확인 후 수집 목록에 추가할게요.
                </p>
                <Button className="mt-5 w-full rounded-xl" onClick={() => setOpen(false)}>
                  확인
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-[16.5px] font-extrabold tracking-tight">기술블로그 추가 요청</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  보고 싶은 회사·팀 기술블로그를 알려주세요.
                </p>
                <div className="mt-5 space-y-4">
                  <Field label="블로그 이름">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 라인"
                      maxLength={60}
                    />
                  </Field>
                  <Field label="주소 (블로그 또는 RSS)">
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://techblog.example.com"
                      maxLength={300}
                      className="font-mono text-[13.5px]"
                    />
                  </Field>
                </div>
                {error && <p className="mt-3 text-[12.5px] font-bold text-acc">{error}</p>}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-line bg-white py-2.5 text-[14px] font-bold text-sub transition hover:bg-paper"
                  >
                    취소
                  </button>
                  <Button
                    className="flex-1 rounded-xl py-2.5"
                    disabled={pending || !name.trim() || !url.trim()}
                    onClick={submit}
                  >
                    {pending ? "요청 중…" : "요청하기"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
