"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  handle: string | null;
  loggedIn: boolean;
}

const ICONS = {
  feed: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  tags: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7V3h10.6l6.4 6.4a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  sources: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 4v5" />
    </svg>
  ),
  my: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  ),
  teams: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a6.5 6.5 0 0 0-3-5.5" />
    </svg>
  ),
} as const;

/** 모바일 플로팅 필 탭바 (iOS 26 앱스토어 스타일) — 데스크톱에선 숨김. */
export function MobileTabBar({ handle, loggedIn }: Props) {
  const pathname = usePathname();
  const myHref = loggedIn ? (handle ? `/@${handle}` : "/settings") : "/login";

  const items = [
    { key: "feed", href: "/", label: "피드", icon: ICONS.feed, active: pathname === "/" },
    { key: "tags", href: "/tags", label: "태그", icon: ICONS.tags, active: pathname.startsWith("/tags") },
    { key: "write", href: "/write", label: "", icon: null, active: false },
    { key: "sources", href: "/sources", label: "기업", icon: ICONS.sources, active: pathname.startsWith("/sources") },
    { key: "teams", href: "/teams", label: "팀", icon: ICONS.teams, active: pathname.startsWith("/teams") },
    {
      key: "my",
      href: myHref,
      label: "MY",
      icon: ICONS.my,
      active:
        pathname.startsWith("/settings") ||
        pathname.startsWith("/posts") ||
        (handle ? decodeURIComponent(pathname).startsWith(`/@${handle}`) : false),
    },
  ];

  return (
    <nav className="fixed inset-x-0 z-40 flex justify-center sm:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}>
      <div className="flex items-center gap-0.5 rounded-full border border-black/[.06] bg-card/85 px-2 py-1.5 shadow-[0_10px_34px_rgba(26,24,21,.18),0_2px_8px_rgba(26,24,21,.08)] backdrop-blur-xl">
        {items.map((t) =>
          t.key === "write" ? (
            <Link key="write" href="/write" aria-label="글쓰기" className="mx-1">
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-white transition active:scale-95"
                style={{
                  background: "linear-gradient(145deg, #ff7a5c 0%, #e0533d 65%, #cf4530 100%)",
                  boxShadow: "0 6px 16px rgba(224,83,61,.4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </Link>
          ) : (
            <Link
              key={t.key}
              href={t.href}
              className={`flex min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-full px-2 py-2 transition ${
                t.active ? "bg-ink/[.07] text-ink" : "text-faint active:bg-ink/[.04]"
              }`}
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
