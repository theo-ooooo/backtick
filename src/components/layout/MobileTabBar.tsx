"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  handle: string | null;
  loggedIn: boolean;
}

const ICONS = {
  feed: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  tags: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7V3h10.6l6.4 6.4a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  sources: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 4v5" />
    </svg>
  ),
  my: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
} as const;

/** 모바일 하단 탭바 (iOS 스타일) — 데스크톱에선 숨김. */
export function MobileTabBar({ handle, loggedIn }: Props) {
  const pathname = usePathname();
  const myHref = loggedIn ? (handle ? `/@${handle}` : "/settings") : "/login";

  const tabs = [
    { href: "/", label: "피드", icon: ICONS.feed, active: pathname === "/" },
    { href: "/tags", label: "태그", icon: ICONS.tags, active: pathname.startsWith("/tags") },
    { href: "/write", label: "", icon: null, active: false }, // center action
    { href: "/sources", label: "기업", icon: ICONS.sources, active: pathname.startsWith("/sources") },
    { href: myHref, label: "MY", icon: ICONS.my, active: pathname.startsWith("/settings") || pathname.startsWith("/posts") || (handle ? decodeURIComponent(pathname).startsWith(`/@${handle}`) : false) },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex h-[60px] max-w-[520px] items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t, i) =>
          i === 2 ? (
            <Link key="write" href="/write" aria-label="글쓰기" className="flex items-center px-3">
              <span className="flex h-11 w-11 -translate-y-3 items-center justify-center rounded-2xl bg-acc text-white shadow-[0_6px_16px_rgba(224,83,61,.45)] transition active:scale-95">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </Link>
          ) : (
            <Link
              key={t.href + t.label}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 ${t.active ? "text-ink" : "text-faint"}`}
            >
              {t.icon}
              <span className="text-[10px] font-bold">{t.label}</span>
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
