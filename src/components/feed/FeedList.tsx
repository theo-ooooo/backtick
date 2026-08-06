"use client";

import type { FeedItem } from "@/lib/feed";
import { FeedItemRow } from "./FeedItemRow";
import { useReadPosts } from "@/hooks/useReadPosts";

/** 피드 리스트 공용 컴포넌트 — 읽음 표시(localStorage)를 한 곳에서 관리. */
export function FeedList({ items, empty = "아직 글이 없어요" }: { items: FeedItem[]; empty?: string }) {
  const { isRead, markRead } = useReadPosts();

  return (
    <ul className="divide-y divide-line/70">
      {items.map((item) => (
        <li key={item.url}>
          <FeedItemRow item={item} read={isRead(item.url)} onRead={() => markRead(item.url)} />
        </li>
      ))}
      {items.length === 0 && <li className="py-24 text-center text-sm text-faint">{empty}</li>}
    </ul>
  );
}
