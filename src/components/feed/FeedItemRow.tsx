"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { FeedItem } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import { dotColor } from "@/lib/colors";
import { TagChip } from "@/components/ui/TagChip";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  item: FeedItem;
  read?: boolean;
  onRead?: () => void;
}

/** One row in the unified feed — native posts and collected external posts share this. */
export function FeedItemRow({ item, read = false, onRead }: Props) {
  const external = item.kind === "external";
  const [summary, setSummary] = useState<string | null>(null);
  const [sumState, setSumState] = useState<"idle" | "loading" | "open" | "error">("idle");

  function toggleSummary(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (sumState === "open") return setSumState("idle");
    if (summary) return setSumState("open");
    setSumState("loading");
    fetch("/api/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: item.kind, url: item.url }),
    })
      .then(async (r) => {
        const j = (await r.json()) as { summary?: string; error?: string };
        if (r.ok && j.summary) {
          setSummary(j.summary);
          setSumState("open");
        } else {
          setSumState("error");
        }
      })
      .catch(() => setSumState("error"));
  }
  return (
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
        {sumState === "open" && summary && (
          <div className="mt-2.5 max-w-[620px] rounded-xl bg-acc-soft/60 px-4 py-3">
            <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-acc">AI 요약</div>
            <p className="whitespace-pre-line text-[13.5px] font-medium leading-relaxed text-ink">{summary}</p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              {item.tags.slice(0, 3).map((t) => (
                <TagChip key={t} name={t} />
              ))}
              {item.likes != null && item.likes > 0 && (
                <span className="ml-1 flex shrink-0 items-center gap-1 text-[12px] font-semibold text-faint">
                  <span className="text-acc">♡</span> {item.likes}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleSummary}
              disabled={sumState === "loading"}
              className={`ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[4px] text-[11.5px] font-bold transition ${
                sumState === "open"
                  ? "bg-acc text-white"
                  : sumState === "error"
                    ? "bg-paper text-faint"
                    : "bg-acc-soft text-acc hover:bg-acc hover:text-white"
              }`}
            >
              {sumState === "loading" ? "요약 중…" : sumState === "error" ? "요약 불가" : sumState === "open" ? "닫기" : "✨ AI 요약"}
            </button>
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
  );
}
