"use client";

import type { FeedItem } from "@/lib/feed";
import { FeedItemRow } from "./FeedItemRow";
import { useReadPosts } from "@/hooks/useReadPosts";
import { useBookmarks } from "@/hooks/useBookmarks";

/** 피드 리스트 공용 컴포넌트 — 읽음 표시(localStorage)를 한 곳에서 관리. */
export function FeedList({ items, empty = "아직 글이 없어요" }: { items: FeedItem[]; empty?: string }) {
  const { isRead, markRead } = useReadPosts();
  const { isBookmarked, toggle } = useBookmarks();

  return (
    <ul className="divide-y divide-line/70">
      {items.map((item) => (
        <li key={item.url}>
          <FeedItemRow
            item={item}
            read={isRead(item.url)}
            onRead={() => markRead(item.url)}
            bookmarked={isBookmarked(item.id)}
            onBookmark={() => toggle(item.kind, item.id)}
          />
        </li>
      ))}
      {items.length === 0 && <li className="py-24 text-center text-sm text-faint">{empty}</li>}
    </ul>
  );
}
