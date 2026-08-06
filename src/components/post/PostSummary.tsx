"use client";

import { useState } from "react";

interface Props {
  /** /@handle/slug — /api/summary native 키 */
  url: string;
  /** DB에 캐시된 요약 (있으면 바로 펼침) */
  initial?: string | null;
}

/** 글 상세 상단 AI 3줄 요약 패널 — 캐시는 서버에서 바로, 없으면 버튼으로 생성. */
export function PostSummary({ url, initial }: Props) {
  const [summary, setSummary] = useState(initial ?? null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  function generate() {
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
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-acc/20 bg-gradient-to-br from-acc-soft/70 to-acc-soft/25">
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-acc">✨ AI 요약</span>
        {!summary && (
          <button
            type="button"
            disabled={state === "loading"}
            onClick={generate}
            className="ml-auto rounded-full bg-acc px-3.5 py-1 text-[12px] font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {state === "loading" ? "요약 중…" : state === "error" ? "다시 시도" : "3줄 요약 보기"}
          </button>
        )}
      </div>
      <div className="px-5 pb-4 pt-2">
        {summary ? (
          <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-ink">{summary}</p>
        ) : (
          <p className="text-[13px] text-muted">
            {state === "error" ? "요약 생성에 실패했어요. 다시 시도해주세요." : "긴 글, 핵심만 먼저 — 이 글을 3줄로 정리해드려요."}
          </p>
        )}
      </div>
    </div>
  );
}
