"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { logout } from "@/lib/actions/auth";

interface Props {
  name: string;
  image: string | null;
  handle: string | null;
  /** 로그인 수단 — github | google | email */
  provider: string;
}

/** 계정 유형 마크 — 소셜은 로고, 일반(이메일) 계정은 백틱 마크 */
function ProviderMark({ provider }: { provider: string }) {
  if (provider === "github") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-ink" aria-label="GitHub 계정">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    );
  }
  if (provider === "google") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0" aria-label="Google 계정">
        <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.03c2.2-2.05 3.5-5.05 3.5-8.6" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.06 7.9-2.9l-3.76-2.9c-1 .7-2.36 1.2-4.14 1.2-3.16 0-5.84-2.08-6.8-4.96l-.14.01-3.64 2.8-.05.14C3.35 21.3 7.36 24 12 24" />
        <path fill="#FBBC05" d="M5.2 14.44a7.4 7.4 0 0 1-.4-2.36c0-.82.15-1.62.4-2.36l-.01-.16-3.68-2.85-.12.06A11.96 11.96 0 0 0 .1 12.1c0 1.94.47 3.77 1.29 5.4l3.8-3.05" />
        <path fill="#EB4335" d="M12 4.76c2.24 0 3.75.97 4.62 1.78l3.37-3.3C17.9 1.24 15.2 0 12 0 7.36 0 3.35 2.67 1.4 6.56l3.8 2.96C6.16 6.84 8.84 4.76 12 4.76" />
      </svg>
    );
  }
  return (
    <span className="shrink-0 font-mono text-[14px] font-semibold leading-none text-acc" aria-label="백틱 계정">
      `
    </span>
  );
}

/** 헤더 아바타 드롭다운 — 내 블로그 / 내 글 / 설정 / 로그아웃 */
export function UserMenu({ name, image, handle, provider }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item =
    "block w-full rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-sub transition hover:bg-paper hover:text-ink";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-full transition hover:opacity-80"
      >
        <Avatar name={name} image={image} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[200px] rounded-2xl border border-line bg-card p-1.5 shadow-[0_8px_30px_rgba(26,24,21,.12)]"
        >
          <div className="border-b border-line px-3.5 pb-2.5 pt-2">
            <div className="flex items-center gap-1.5">
              <ProviderMark provider={provider} />
              <span className="truncate text-[14px] font-extrabold text-ink">{name}</span>
            </div>
            {handle && <div className="truncate font-mono text-[11.5px] text-muted">@{handle}</div>}
          </div>
          <div className="pt-1.5" onClick={() => setOpen(false)}>
            {handle && (
              <Link href={`/@${handle}`} className={item} role="menuitem">
                내 블로그
              </Link>
            )}
            <Link href="/posts" className={item} role="menuitem">
              내 글
            </Link>
            <Link href="/bookmarks" className={item} role="menuitem">
              저장한 글
            </Link>
            <Link href="/stats" className={item} role="menuitem">
              내 통계
            </Link>
            <Link href="/settings" className={item} role="menuitem">
              설정
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                e.stopPropagation(); // 래퍼의 메뉴닫기 onClick이 액션 실행 전에 언마운트시키지 않도록
                startTransition(async () => {
                  await logout();
                });
              }}
              className={`${item} text-acc hover:text-acc disabled:opacity-50`}
              role="menuitem"
            >
              {pending ? "로그아웃 중…" : "로그아웃"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
