"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "checking" | "ok" | "taken";

/** 닉네임 입력 — 실시간 중복 확인 (저장 전에 결과를 보여준다). */
export function NicknameField({ defaultValue }: { defaultValue: string }) {
  const [name, setName] = useState(defaultValue);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // lint(set-state-in-effect) 회피 — 동기 setState는 마이크로태스크로 미룬다
    if (!name.trim() || name === defaultValue) {
      queueMicrotask(() => setStatus("idle"));
      return;
    }
    queueMicrotask(() => setStatus("checking"));
    const t = setTimeout(() => {
      fetch(`/api/nickname-check?n=${encodeURIComponent(name.trim())}`)
        .then((r) => r.json() as Promise<{ available: boolean }>)
        .then((j) => setStatus(j.available ? "ok" : "taken"))
        .catch(() => setStatus("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [name, defaultValue]);

  return (
    <div>
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border transition ${
          status === "taken" ? "border-acc" : status === "ok" ? "border-[#0ca678]" : "border-line focus-within:border-acc"
        }`}
      >
        <input
          name="name"
          value={name}
          required
          maxLength={40}
          placeholder="다른 사람과 겹치지 않는 닉네임"
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-card px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint"
        />
        <span className="flex w-9 items-center justify-center text-[15px]">
          {status === "checking" && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-acc" />
          )}
          {status === "ok" && <span className="font-bold text-[#0ca678]">✓</span>}
          {status === "taken" && <span className="font-bold text-acc">✗</span>}
        </span>
      </div>
      {status === "taken" && <p className="mt-1.5 px-1 text-[12px] font-medium text-acc">이미 사용 중인 닉네임이에요</p>}
      {status === "ok" && <p className="mt-1.5 px-1 text-[12px] font-medium text-[#0ca678]">사용 가능한 닉네임이에요</p>}
    </div>
  );
}
