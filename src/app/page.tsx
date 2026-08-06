import Link from "next/link";
import { getFeed, getTrendingTags, type FeedTab, type FeedSort } from "@/lib/feed";
import { SortSelect } from "@/components/feed/SortSelect";
import { getEnabledFeeds } from "@/lib/queries/source";
import { HomeFeed } from "@/components/feed/HomeFeed";
import { IntroPopup } from "@/components/home/IntroPopup";
import { Panel } from "@/components/ui/Panel";

export const revalidate = 300;

const TABS: { key: FeedTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "backtick", label: "백틱" },
  { key: "tech", label: "기술블로그" },
];

export default async function Home(props: PageProps<"/">) {
  const { tab: rawTab, sort: rawSort } = await props.searchParams;
  const tab: FeedTab = rawTab === "backtick" || rawTab === "tech" ? rawTab : "all";
  const sort: FeedSort = rawSort === "popular" ? "popular" : "latest";
  const [items, feeds, trending] = await Promise.all([
    getFeed(tab, sort, 0, 20),
    getEnabledFeeds(),
    getTrendingTags(6),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <IntroPopup />
      <div className="flex gap-8">
        <section className="min-w-0 flex-1">
          <div className="flex items-center border-b border-line">
            <div className="flex">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/?${new URLSearchParams({ ...(t.key !== "all" ? { tab: t.key } : {}), ...(sort !== "latest" ? { sort } : {}) }).toString()}`}
                  className={`px-4 py-3.5 text-[14.5px] font-bold tracking-tight ${
                    tab === t.key ? "-mb-px border-b-2 border-ink text-ink" : "text-muted hover:text-sub"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <SortSelect current={sort} />
          </div>

          <HomeFeed initialItems={items} tab={tab} sort={sort} sourceNames={feeds.map((f) => f.name)} />
        </section>

        <aside className="hidden w-[280px] shrink-0 lg:block">
          {trending.length > 0 && (
            <Panel className="mb-4 p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted">트렌딩 태그</span>
                <span className="font-mono text-[10px] text-faint">30d</span>
              </div>
              <ol className="space-y-2.5">
                {trending.map((t, i) => (
                  <li key={t.name} className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[11px] font-semibold text-acc">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-mono text-[13px] font-semibold text-ink">{t.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-faint">{t.count}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

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
