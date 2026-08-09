import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getWriterStats } from "@/lib/queries/stats";
import { ContributionCalendar } from "@/components/stats/ContributionCalendar";

export const metadata: Metadata = { title: "내 통계", robots: { index: false } };

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-4">
      <div className="font-mono text-[11px] font-semibold tracking-[0.08em] text-faint">{label}</div>
      <div className="mt-1 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
        {value.toLocaleString()}
        {suffix && <span className="ml-0.5 text-[14px] font-bold text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

/** 내 글쓰기 통계 — 잔디 캘린더 + 합계 + 글별 반응 랭킹. */
export default async function StatsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  const stats = await getWriterStats(me.id);

  return (
    <main className="mx-auto w-full max-w-[880px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">내 통계</h1>
      <p className="mt-1 text-[13.5px] text-muted">기록이 쌓이는 걸 눈으로 확인해요.</p>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="발행한 글" value={stats.totalPosts} />
        <StatCard label="총 조회수" value={stats.totalViews} />
        <StatCard label="받은 좋아요" value={stats.totalLikes} />
        <StatCard label="받은 댓글" value={stats.totalComments} />
        <div className="col-span-2 rounded-2xl bg-[#1a1815] px-5 py-4 sm:col-span-1">
          <div className="font-mono text-[11px] font-semibold tracking-[0.08em] text-white/50">연속 작성</div>
          <div className="mt-1 text-[26px] font-extrabold tracking-[-0.02em] text-white">
            {stats.streak > 0 ? "🔥 " : ""}
            {stats.streak}
            <span className="ml-0.5 text-[14px] font-bold text-white/60">일</span>
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-5 text-[15px] font-extrabold">
          글쓰기 잔디 <span className="ml-1 font-mono text-[12px] font-semibold text-faint">최근 1년</span>
        </h2>
        <ContributionCalendar days={stats.days} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[15px] font-extrabold">글별 반응</h2>
        {stats.posts.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-6 py-10 text-center text-[14px] text-muted">
            아직 발행한 글이 없어요.{" "}
            <Link href="/write" className="font-bold text-acc">
              첫 글을 써볼까요? →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {stats.posts.slice(0, 20).map((p, i) => (
              <Link
                key={p.id}
                href={`/@${me.handle}/${encodeURIComponent(p.slug)}`}
                className="flex items-center gap-4 border-b border-line px-5 py-3.5 transition last:border-0 hover:bg-paper/60"
              >
                <span className="w-5 shrink-0 font-mono text-[12px] font-bold text-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{p.title}</span>
                <span className="flex shrink-0 items-center gap-3 font-mono text-[12px] font-semibold text-muted">
                  <span>👁 {p.views.toLocaleString()}</span>
                  <span className="text-acc">♥ {p.likes}</span>
                  <span>💬 {p.comments}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
