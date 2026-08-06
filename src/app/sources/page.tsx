import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { logoColor } from "@/lib/colors";
import { timeAgo, toDomain } from "@/lib/format";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "기업 기술블로그",
  description: "국내 기업 기술블로그를 RSS로 수집합니다. 원문 링크로 연결되며, 피드에 출처 배지가 붙습니다.",
};

export default async function SourcesPage() {
  const feeds = await prisma.feed.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    include: {
      posts: { orderBy: { fetchedAt: "desc" }, take: 1, select: { fetchedAt: true } },
      _count: { select: { posts: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <section>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">기업 기술블로그</h1>
        <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-muted">
          국내 {feeds.length}개 기업·플랫폼의 기술블로그를 RSS로 수집합니다. 원문 링크로 연결되며, 피드에는 출처
          배지가 붙습니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((f) => (
            <a
              key={f.id}
              href={f.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-line p-5 transition hover:border-acc/50 hover:shadow-[0_4px_16px_rgba(224,83,61,.08)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[16px] font-extrabold text-white"
                  style={{ background: logoColor(f.name) }}
                >
                  {f.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="text-[15.5px] font-extrabold tracking-tight group-hover:text-acc">{f.name}</div>
                  <div className="truncate font-mono text-[11px] text-faint">{toDomain(f.siteUrl)}</div>
                </div>
              </div>
              {f.description && (
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{f.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2 font-mono text-[11.5px] text-faint">
                <span>글 {f._count.posts}</span>
                <span>·</span>
                <span>{timeAgo(f.posts[0]?.fetchedAt ?? null)} 수집</span>
                <span className="ml-auto opacity-0 transition group-hover:opacity-100">원문 ↗</span>
              </div>
            </a>
          ))}

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-faint/60 p-5 text-center">
            <span className="font-mono text-[18px] text-faint">`</span>
            <div className="mt-1 text-[14px] font-bold text-sub">블로그 추가 요청</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              수집되었으면 하는 기술블로그의
              <br />
              RSS 주소를 알려주세요.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
