"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TagChip } from "@/components/ui/TagChip";

export interface BlogPostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  date: string; // ISO
  tags: string[];
}

interface Props {
  handle: string;
  initial: BlogPostCard[];
  total: number;
}

const TAKE = 12;

/** 블로그 글 목록 — 12개씩 무한스크롤 (홈 피드와 같은 sentinel 패턴). */
export function BlogPostList({ handle, initial, total }: Props) {
  const [posts, setPosts] = useState(initial);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const done = posts.length >= total;

  useEffect(() => {
    if (done || !sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading) return;
        setLoading(true);
        const next = pageRef.current + 1;
        fetch(`/api/blog-posts?handle=${encodeURIComponent(handle)}&page=${next}`)
          .then(async (r) => {
            const j = (await r.json()) as { items?: BlogPostCard[] };
            if (r.ok && j.items) {
              pageRef.current = next;
              setPosts((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...j.items!.filter((p) => !seen.has(p.id))];
              });
            }
          })
          .finally(() => setLoading(false));
      },
      { rootMargin: "600px" },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [handle, done, loading]);

  return (
    <>
      <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/@${handle}/${encodeURIComponent(p.slug)}`}
            className="group border-b border-line py-6"
          >
            <div className="font-mono text-[11.5px] text-faint">{p.date.slice(0, 10).replaceAll("-", ".")}</div>
            <h2 className="mt-1.5 text-[17px] font-extrabold leading-snug tracking-[-0.02em] group-hover:text-acc">
              {p.title}
            </h2>
            {p.excerpt && <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{p.excerpt}</p>}
            {p.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.slice(0, 3).map((t) => (
                  <TagChip key={t} name={t} />
                ))}
              </div>
            )}
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="col-span-2 py-20 text-center text-sm text-faint">아직 발행한 글이 없어요</p>
        )}
      </div>
      {!done && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-acc" aria-label="불러오는 중" />
        </div>
      )}
    </>
  );
}
