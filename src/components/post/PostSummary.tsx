"use client";

import { useState } from "react";

interface Props {
  /** /@handle/slug — /api/summary native 키 */
  url: string;
  /** DB에 캐시된 요약 (있으면 바로 펼침) */
  initial?: string | null;
}

/** 글 상세 상단 AI 3줄 요약 — 캐시는 서버에서 바로, 없으면 버튼으로 생성. */
export function PostSummary({ url, initial }: Props) {
  const [summary, setSummary] = useState(initial ?? null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  if (summary) {
    return (
      <div className="mt-6 rounded-2xl bg-acc-soft/60 px-5 py-4">
        <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-acc">✨ AI 요약</div>
        <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-ink">{summary}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={() => {
        setState("loading");
        fetch("/api/summary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "native", url }),
        })
          .then(async (r) => {
            const j = (await r.json()) as { summary?: string };
            if (r.ok && j.summary) setSummary(j.summary);
            else setState("error");
          })
          .catch(() => setState("error"));
      }}
      className="mt-6 flex items-center gap-1.5 rounded-full bg-acc-soft px-4 py-2 text-[13px] font-bold text-acc transition hover:bg-acc hover:text-white disabled:opacity-60"
    >
      {state === "loading" ? "요약 중…" : state === "error" ? "요약 불가" : "✨ AI 요약 보기"}
    </button>
  );
}
