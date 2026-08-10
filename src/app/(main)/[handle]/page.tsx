import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserWithPosts, getPopularPosts, getCollections } from "@/lib/queries/user";
import { getWritingDays } from "@/lib/queries/stats";
import { currentUser } from "@/lib/auth";
import { imgProxy } from "@/lib/img";
import { Avatar } from "@/components/ui/Avatar";
import { BlogPostList } from "@/components/post/BlogPostList";
import { ContributionCalendar } from "@/components/stats/ContributionCalendar";
import { Markdown } from "@/components/markdown/Markdown";

export const revalidate = 300;

export async function generateMetadata(props: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const user = await getUserWithPosts(handle);
  if (!user) return {};
  return {
    title: `${user.name ?? user.handle} (@${user.handle})`,
    description: user.bio ?? undefined,
  };
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:border-acc hover:text-acc"
    >
      {children}
    </a>
  );
}

/** until 스타일 블로그 홈 — 좌측 프로필 컬럼 + 우측 [개요 | 글] 탭. */
export default async function BlogHome(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  const { tab } = await props.searchParams;
  const view = tab === "posts" || tab === "collections" ? tab : "overview";

  const user = await getUserWithPosts(handle);
  if (!user || !user.handle) notFound();
  const [days, popular, me, collections] = await Promise.all([
    getWritingDays(user.id),
    getPopularPosts(user.id, 3),
    currentUser(),
    view === "collections" || view === "overview" ? getCollections(user.id) : Promise.resolve([]),
  ]);
  const mine = me?.id === user.id;
  const recent = user.posts.slice(0, 4);

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-1 py-3 text-[14.5px] font-bold ${
      active ? "-mb-px border-b-2 border-ink text-ink" : "text-muted hover:text-sub"
    }`;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        {/* 좌측 프로필 컬럼 */}
        <aside className="w-full shrink-0 md:w-[256px]">
          <div className="flex items-center gap-4 md:block">
            <Avatar name={user.name ?? user.handle} image={imgProxy(user.image, "avatar", user.id)} size="xl" tone="neutral" />
            <div className="md:mt-5">
              <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">{user.name ?? user.handle}</h1>
              <p className="font-mono text-[13px] text-muted">@{user.handle}</p>
            </div>
          </div>

          {user.bio && <p className="mt-4 text-[14px] leading-relaxed text-sub">{user.bio}</p>}

          {mine && (
            <Link
              href="/settings"
              className="mt-4 block rounded-xl border border-line py-2.5 text-center text-[13.5px] font-bold text-sub transition hover:border-ink hover:text-ink"
            >
              프로필 수정
            </Link>
          )}

          <div className="mt-5 flex gap-2">
            {user.publicEmail && (
              <SocialIcon href={`mailto:${user.publicEmail}`} label="이메일">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <rect x="1.5" y="3" width="13" height="10" rx="2" />
                  <path d="m2 4.5 6 4.5 6-4.5" />
                </svg>
              </SocialIcon>
            )}
            {user.githubUrl && (
              <SocialIcon href={user.githubUrl.startsWith("http") ? user.githubUrl : `https://${user.githubUrl}`} label="GitHub">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
              </SocialIcon>
            )}
            {user.websiteUrl && (
              <SocialIcon href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`} label="웹사이트">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <circle cx="8" cy="8" r="6.4" />
                  <path d="M1.6 8h12.8M8 1.6c1.9 1.7 2.9 4 2.9 6.4S9.9 12.7 8 14.4M8 1.6C6.1 3.3 5.1 5.6 5.1 8s1 4.7 2.9 6.4" />
                </svg>
              </SocialIcon>
            )}
          </div>
        </aside>

        {/* 우측 콘텐츠 */}
        <section className="min-w-0 flex-1">
          <div className="flex gap-5 overflow-x-auto border-b border-line">
            <Link href={`/@${user.handle}`} className={tabCls(view === "overview")}>
              개요
            </Link>
            <Link href={`/@${user.handle}?tab=posts`} className={tabCls(view === "posts")}>
              글
              <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold text-muted">
                {user._count.posts}
              </span>
            </Link>
            <Link href={`/@${user.handle}?tab=collections`} className={tabCls(view === "collections")}>
              시리즈
            </Link>
          </div>

          {view === "overview" ? (
            <div className="mt-6 space-y-9">
              {user.readme && (
                <div className="rounded-2xl border border-line bg-card px-6 py-5">
                  <Markdown content={user.readme} />
                </div>
              )}
              <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-[14px] font-extrabold">
                  글쓰기 잔디 <span className="ml-1 font-mono text-[11.5px] font-semibold text-faint">최근 1년</span>
                </h2>
                <ContributionCalendar days={days} />
              </div>

              {popular.length > 0 && (
                <div>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-[15px] font-extrabold">인기 글</h2>
                    <Link href={`/@${user.handle}?tab=posts`} className="text-[12.5px] font-bold text-muted hover:text-acc">
                      더보기 →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {popular.map((p) => (
                      <Link
                        key={p.id}
                        href={`/@${user.handle}/${encodeURIComponent(p.slug)}`}
                        className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,24,21,.08)]"
                      >
                        {p.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgProxy(p.coverImage, "cover", p.id) ?? ""} alt="" className="h-[120px] w-full object-cover" />
                        ) : (
                          <div className="flex h-[120px] flex-col justify-between bg-[#1a1815] p-3.5">
                            <span className="font-mono text-[18px] leading-none text-acc">`</span>
                            <span className="line-clamp-2 text-[12px] font-bold leading-snug text-white/85">{p.title}</span>
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="line-clamp-2 text-[13.5px] font-extrabold leading-snug group-hover:text-acc">{p.title}</h3>
                          <p className="mt-2 font-mono text-[11px] text-faint">
                            조회 {p.views.toLocaleString()} · {p.readMinutes}분
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <h2 className="text-[15px] font-extrabold">최근 글</h2>
                  <Link href={`/@${user.handle}?tab=posts`} className="text-[12.5px] font-bold text-muted hover:text-acc">
                    전체 {user._count.posts}개 →
                  </Link>
                </div>
                <ul className="divide-y divide-line/70">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <Link href={`/@${user.handle}/${encodeURIComponent(p.slug)}`} className="group flex items-baseline gap-3 py-3.5">
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink group-hover:text-acc">{p.title}</span>
                        <span className="shrink-0 font-mono text-[11.5px] text-faint">
                          {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10).replaceAll("-", ".")}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {recent.length === 0 && <li className="py-10 text-center text-sm text-faint">아직 발행한 글이 없어요</li>}
                </ul>
              </div>
            </div>
          ) : view === "posts" ? (
            <div className="mt-2">
              <BlogPostList
                handle={user.handle}
                total={user._count.posts}
                initial={user.posts.map((p) => ({
                  id: p.id,
                  slug: p.slug,
                  title: p.title,
                  excerpt: p.excerpt,
                  date: (p.publishedAt ?? p.createdAt).toISOString(),
                  tags: p.tags.map((t) => t.tag.name),
                }))}
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {collections.length === 0 && (
                <p className="col-span-full py-16 text-center text-sm text-faint">
                  아직 시리즈가 없어요{mine ? " — 글 쓸 때 시리즈로 묶어보세요" : ""}
                </p>
              )}
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={`/@${user.handle}/collections/${c.slug}`}
                  className="rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,24,21,.08)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[15px] text-acc">＃</span>
                    <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">{c.name}</h3>
                    <span className="shrink-0 font-mono text-[12px] text-faint">{c._count.posts}편</span>
                  </div>
                  {c.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{c.description}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
