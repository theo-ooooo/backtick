"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";

interface Item {
  id: string;
  type: string;
  read: boolean;
  actor: string;
  postTitle: string;
  url: string;
  createdAt: string;
}

const LABEL: Record<string, string> = {
  comment: "님이 댓글을 남겼어요",
  reply: "님이 답글을 달았어요",
  like: "님이 좋아요를 눌렀어요",
};

/** 헤더 알림 벨 — 안읽음 배지 + 드롭다운, 열면 읽음 처리. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setItems(j.items);
          setUnread(j.unread);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function onOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      setUnread(0);
      void fetch("/api/notifications", { method: "POST" });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label="알림"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-ink"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-acc px-1 font-mono text-[9.5px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[300px] rounded-2xl border border-line bg-card p-1.5 shadow-[0_8px_30px_rgba(26,24,21,.12)]">
          <div className="border-b border-line px-3.5 pb-2 pt-1.5 text-[13px] font-extrabold text-ink">알림</div>
          {items.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[13px] text-faint">아직 알림이 없어요</p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto pt-1">
              {items.map((n) => (
                <Link
                  key={n.id}
                  href={n.url}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3.5 py-2.5 transition hover:bg-paper ${n.read ? "" : "bg-acc-soft/40"}`}
                >
                  <p className="text-[13px] leading-snug text-sub">
                    <b className="text-ink">{n.actor}</b>
                    {LABEL[n.type] ?? "님의 활동"}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">{n.postTitle}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-faint">{timeAgo(new Date(n.createdAt))}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
