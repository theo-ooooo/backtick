import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "w-full rounded-xl border border-line bg-white text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc";

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[13px] font-bold text-sub">{children}</label>;
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${CONTROL} px-4 py-3 ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${CONTROL} resize-none px-4 py-3 leading-relaxed ${className}`} {...rest} />;
}

/** Label + control 묶음 — 설정/로그인 폼의 기본 단위 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
