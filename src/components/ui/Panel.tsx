import type { ReactNode } from "react";

/** White rounded card on the warm paper ground — the base surface of every page. */
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(26,24,21,.04)] ${className}`}>
      {children}
    </div>
  );
}
