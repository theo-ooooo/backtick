import type { Metadata } from "next";
import Link from "next/link";
import { getTrendingTags } from "@/lib/feed";
import { getAllTags } from "@/lib/queries/tag";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "태그",
  description: "수집 글과 백틱 글에 붙은 태그를 둘러보세요.",
};

export default async function TagsPage() {
  const [trending, all] = await Promise.all([getTrendingTags(4), getAllTags()]);

  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-10">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">태그</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        {all.length}개의 태그가 사용되고 있습니다. 태그를 누르면 관련 글을 모아 볼 수 있어요.
      </p>

      {trending.length > 0 && (
        <>
          <div className="mt-9 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted">TRENDING · 30D</div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {trending.map((t) => (
              <Link
                key={t.name}
                href={`/tags/${encodeURIComponent(t.name)}`}
                className="group rounded-xl border border-line p-4 transition hover:border-acc/50"
              >
                <div className="truncate font-mono text-[14px] font-bold group-hover:text-acc">{t.name}</div>
                <div className="mt-1.5 font-mono text-[11.5px] text-faint">글 {t.count}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-10 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted">ALL TAGS</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {all.map((t) => (
          <Link
            key={t.name}
            href={`/tags/${encodeURIComponent(t.name)}`}
            className="rounded-lg border border-line bg-paper/60 px-2.5 py-1.5 font-mono text-[12.5px] font-medium text-sub transition hover:border-acc hover:text-acc"
          >
            {t.name} <span className="text-faint">{t.count}</span>
          </Link>
        ))}
        {all.length === 0 && <p className="py-10 text-sm text-faint">아직 태그가 없어요</p>}
      </div>
    </main>
  );
}
