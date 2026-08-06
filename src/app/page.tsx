import Link from "next/link";
import { getFeed, type FeedTab } from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { FeedItemRow } from "@/components/feed/FeedItemRow";
import { Panel } from "@/components/ui/Panel";

export const revalidate = 300;

const TABS: { key: FeedTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "backtick", label: "백틱" },
  { key: "tech", label: "기술블로그" },
];

export default async function Home(props: PageProps<"/">) {
  const { tab: rawTab } = await props.searchParams;
  const tab: FeedTab = rawTab === "backtick" || rawTab === "tech" ? rawTab : "all";
  const [items, feeds] = await Promise.all([
    getFeed(tab),
    prisma.feed.findMany({ where: { enabled: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <div className="flex gap-8">
        <Panel className="min-w-0 flex-1 px-7 pb-6 pt-2">
          <div className="flex items-center border-b border-line">
            <div className="flex">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/" : `/?tab=${t.key}`}
                  className={`px-4 py-3.5 text-[14.5px] font-bold tracking-tight ${
                    tab === t.key ? "-mb-px border-b-2 border-ink text-ink" : "text-muted hover:text-sub"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <span className="ml-auto text-[12.5px] font-semibold text-faint">최신순 ▾</span>
          </div>

          <ul className="divide-y divide-line/70">
            {items.map((item) => (
              <li key={item.url}>
                <FeedItemRow item={item} />
              </li>
            ))}
            {items.length === 0 && <li className="py-24 text-center text-sm text-faint">아직 글이 없어요</li>}
          </ul>
        </Panel>

        <aside className="hidden w-[280px] shrink-0 lg:block">
          <Panel className="p-5">
            <div className="mb-4 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted">
              수집 중인 기술블로그
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feeds.map((f) => (
                <Link
                  key={f.id}
                  href="/sources"
                  className="rounded-lg border border-line bg-paper/60 px-2.5 py-1 font-mono text-[12px] font-medium text-sub transition hover:border-acc hover:text-acc"
                >
                  {f.name}
                </Link>
              ))}
            </div>
            <Link href="/sources" className="mt-4 block text-[12.5px] font-bold text-acc hover:underline">
              블로그 전체 보기 →
            </Link>
          </Panel>

          <div className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center">
            <p className="text-[13px] font-semibold leading-relaxed text-muted">
              코드를 감싸는 기호처럼,
              <br />
              당신의 기록을 감싸는 곳
            </p>
            <Link
              href="/write"
              className="mt-3 inline-block rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-bold text-white transition hover:opacity-85"
            >
              첫 글 쓰기
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
