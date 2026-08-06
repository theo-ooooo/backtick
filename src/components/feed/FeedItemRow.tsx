"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { FeedItem } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import { dotColor } from "@/lib/colors";
import { TagChip } from "@/components/ui/TagChip";
import { Avatar } from "@/components/ui/Avatar";
import { SummarySheet } from "./SummarySheet";

interface Props {
  item: FeedItem;
  read?: boolean;
  onRead?: () => void;
}

/** One row in the unified feed — native posts and collected external posts share this. */
export function FeedItemRow({ item, read = false, onRead }: Props) {
  const external = item.kind === "external";
  const [summary, setSummary] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sumState, setSumState] = useState<"idle" | "loading" | "error">("idle");

  // 수집글 전용 — 시트를 바로 열고 요약은 뒤에서 채운다. 백틱 글은 상세 패널에서.
  function openSummary(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSheetOpen(true);
    if (summary || sumState === "loading") return;
    setSumState("loading");
    fetch("/api/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "external", url: item.url }),
    })
      .then(async (r) => {
        const j = (await r.json()) as { summary?: string };
        if (r.ok && j.summary) {
          setSummary(j.summary);
          setSumState("idle");
        } else {
          setSumState("error");
        }
      })
      .catch(() => setSumState("error"));
  }
  return (
    <>
    <a
      href={item.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onRead}
      onAuxClick={onRead}
      className={`group flex gap-5 py-[22px] ${read ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 text-[12.5px]">
          {external ? (
            <>
              <span
                className="inline-block h-[7px] w-[7px] rounded-[2px]"
                style={{ background: dotColor(item.source!) }}
              />
              <span className="font-mono text-[12px] font-semibold text-sub">{item.source}</span>
              <span className="text-faint">수집됨 · {timeAgo(item.publishedAt)}</span>
            </>
          ) : (
            <>
              <Avatar name={item.author ?? "?"} image={item.authorImage} size="sm" />
              <span className="font-bold text-sub">{item.author}</span>
              <span className="text-faint">· {timeAgo(item.publishedAt)}</span>
            </>
          )}
          {read && (
            <span className="ml-auto flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[#0ca678]">
              ✓ 읽음
            </span>
          )}
        </div>
        <h2 className="text-[18px] font-extrabold leading-snug tracking-[-0.02em] text-ink group-hover:text-acc">
          {item.title}
        </h2>
        {item.excerpt && (
          <p className="mt-1.5 line-clamp-2 max-w-[620px] text-[14px] leading-relaxed text-muted">{item.excerpt}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <TagChip key={t} name={t} />
            ))}
            {item.likes != null && item.likes > 0 && (
              <span className="ml-1 flex shrink-0 items-center gap-1 text-[12px] font-semibold text-faint">
                <span className="text-acc">♡</span> {item.likes}
              </span>
            )}
            {external && (
              <button
                type="button"
                onClick={openSummary}
                className="ml-1 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-acc/25 bg-acc-soft px-3 py-[5px] text-[12px] font-bold text-acc shadow-[0_1px_4px_rgba(224,83,61,.12)] transition hover:bg-acc hover:text-white"
              >
                ✨ 3줄 요약
              </button>
            )}
        </div>
      </div>
      {item.thumbnail ? (
        <div className="h-[64px] w-[92px] shrink-0 self-center overflow-hidden rounded-lg border border-line bg-paper sm:h-[76px] sm:w-[116px]">
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        !external && (
          <div className="flex h-[64px] w-[92px] shrink-0 flex-col justify-between self-center overflow-hidden rounded-lg bg-[#1a1815] p-2 sm:h-[76px] sm:w-[116px]">
            <span className="font-mono text-[15px] leading-none text-acc">`</span>
            <span className="line-clamp-2 text-[8.5px] font-bold leading-tight text-white/85 sm:text-[9.5px]">
              {item.title}
            </span>
          </div>
        )
      )}
    </a>
    {external && (
      <SummarySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={item.title}
        source={item.source}
        url={item.url}
        summary={summary}
        loading={sumState === "loading"}
        error={sumState === "error"}
        onRead={onRead}
      />
    )}
    </>
  );
}
