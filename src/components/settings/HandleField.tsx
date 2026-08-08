"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "checking" | "ok" | "taken" | "invalid";

/** 핸들 입력 — 타이핑 정규화 + 실시간 중복 확인 + 내 주소 미리보기. */
export function HandleField({ defaultValue }: { defaultValue: string }) {
  const [handle, setHandle] = useState(defaultValue);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // lint(set-state-in-effect) 회피 — 동기 setState는 마이크로태스크로 미룬다
    if (!handle || handle === defaultValue) {
      queueMicrotask(() => setStatus("idle"));
      return;
    }
    if (!/^[a-z0-9-]{3,20}$/.test(handle)) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }
    queueMicrotask(() => setStatus("checking"));
    const t = setTimeout(() => {
      fetch(`/api/handle-check?h=${encodeURIComponent(handle)}`)
        .then((r) => r.json() as Promise<{ available: boolean }>)
        .then((j) => setStatus(j.available ? "ok" : "taken"))
        .catch(() => setStatus("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [handle, defaultValue]);

  return (
    <div>
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border transition ${
          status === "taken" || status === "invalid"
            ? "border-acc"
            : status === "ok"
              ? "border-[#0ca678]"
              : "border-line focus-within:border-acc"
        }`}
      >
        <span className="flex items-center bg-paper px-3.5 font-mono text-[13px] text-muted">backtick.blog/@</span>
        <input
          name="handle"
          value={handle}
          required
          placeholder="handle"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) =>
            // 입력 즉시 규칙에 맞게 정규화 — 대문자·공백·특수문자를 알아서 정리
            setHandle(
              e.target.value
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 20),
            )
          }
          className="w-full bg-white px-3 py-3 font-mono text-[14.5px] font-medium outline-none"
        />
        <span className="flex w-9 items-center justify-center text-[15px]">
          {status === "checking" && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-acc" />
          )}
          {status === "ok" && <span className="font-bold text-[#0ca678]">✓</span>}
          {(status === "taken" || status === "invalid") && <span className="font-bold text-acc">✗</span>}
        </span>
      </div>
      <p
        className={`mt-1.5 px-1 text-[12px] font-medium ${
          status === "taken" || status === "invalid" ? "text-acc" : status === "ok" ? "text-[#0ca678]" : "text-faint"
        }`}
      >
        {status === "taken"
          ? "이미 사용 중인 핸들이에요"
          : status === "invalid"
            ? "영문 소문자·숫자·하이픈 3~20자"
            : status === "ok"
              ? `사용 가능! 내 블로그: backtick.blog/@${handle}`
              : handle
                ? `내 블로그 주소: backtick.blog/@${handle}`
                : "영문 소문자·숫자·하이픈 3~20자"}
      </p>
    </div>
  );
}
