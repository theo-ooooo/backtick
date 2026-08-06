import type { FeedItem } from "@/lib/feed";
import { timeAgo } from "@/lib/format";
import { dotColor } from "@/lib/colors";

/** One row in the unified feed — native posts and collected external posts share this. */
export function FeedItemRow({ item }: { item: FeedItem }) {
  const external = item.kind === "external";
  return (
    <a
      href={item.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group block py-[22px]"
    >
      <div className="mb-2 flex items-center gap-2 text-[12.5px]">
        {external ? (
          <>
            <span
              className="inline-block h-[7px] w-[7px] rounded-[2px]"
              style={{ background: dotColor(item.source!) }}
            />
            <span className="font-mono text-[12px] font-semibold text-sub">{item.source}</span>
            <span className="text-faint">수집됨 · {timeAgo(item.publishedAt)}</span>
            <span className="ml-auto font-mono text-[11px] text-faint opacity-0 transition group-hover:opacity-100">
              원문 ↗
            </span>
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
        <p className="mt-1.5 line-clamp-2 max-w-[620px] text-[14px] leading-relaxed text-muted">{item.excerpt}</p>
      )}
    </a>
  );
}
