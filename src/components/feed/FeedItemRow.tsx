/* eslint-disable @next/next/no-img-element */
import type { FeedItem } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import { dotColor } from "@/lib/colors";
import { TagChip } from "@/components/ui/TagChip";

/** One row in the unified feed — native posts and collected external posts share this. */
export function FeedItemRow({ item }: { item: FeedItem }) {
  const external = item.kind === "external";
  return (
    <a
      href={item.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group flex gap-5 py-[22px]"
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
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-acc-soft text-[10.5px] font-extrabold text-acc">
                {(item.author ?? "?").charAt(0)}
              </span>
              <span className="font-bold text-sub">{item.author}</span>
              <span className="text-faint">· {timeAgo(item.publishedAt)}</span>
            </>
          )}
        </div>
        <h2 className="text-[18px] font-extrabold leading-snug tracking-[-0.02em] text-ink group-hover:text-acc">
          {item.title}
        </h2>
        {item.excerpt && (
          <p className="mt-1.5 line-clamp-3 max-w-[620px] text-[14px] leading-relaxed text-muted">{item.excerpt}</p>
        )}
        {(item.tags.length > 0 || item.likes != null || external) && (
          <div className="mt-3 flex items-center gap-1.5">
            {item.tags.slice(0, 3).map((t) => (
              <TagChip key={t} name={t} />
            ))}
            {item.likes != null && item.likes > 0 && (
              <span className="ml-1 flex items-center gap-1 text-[12px] font-semibold text-faint">
                <span className="text-acc">♡</span> {item.likes}
              </span>
            )}
            {external && (
              <span className="ml-auto font-mono text-[11px] text-faint opacity-0 transition group-hover:opacity-100">
                원문 ↗
              </span>
            )}
          </div>
        )}
      </div>
      {item.thumbnail && (
        <div className="hidden h-[76px] w-[116px] shrink-0 self-center overflow-hidden rounded-lg border border-line bg-paper sm:block">
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        </div>
      )}
    </a>
  );
}
