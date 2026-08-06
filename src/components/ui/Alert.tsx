import type { ReactNode } from "react";

const TONES = {
  success: "bg-[#e7f6ee] text-[#177245]",
  error: "bg-acc-soft text-acc",
} as const;

/** Inline notice banner (저장 완료 / 검증 실패 등). */
export function Alert({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <div className={`rounded-xl px-4 py-3 text-[13.5px] font-bold ${TONES[tone]}`}>{children}</div>;
}
