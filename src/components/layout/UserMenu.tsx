"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { logout } from "@/lib/actions/auth";

interface Props {
  name: string;
  image: string | null;
  handle: string | null;
}

/** 헤더 아바타 드롭다운 — 내 블로그 / 내 글 / 설정 / 로그아웃 */
export function UserMenu({ name, image, handle }: Props) {
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
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[200px] rounded-2xl border border-line bg-white p-1.5 shadow-[0_8px_30px_rgba(26,24,21,.12)]"
        >
          <div className="border-b border-line px-3.5 pb-2.5 pt-2">
            <div className="truncate text-[14px] font-extrabold text-ink">{name}</div>
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
