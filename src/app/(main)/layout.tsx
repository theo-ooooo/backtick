import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { imgProxy } from "@/lib/img";
import { ButtonLink } from "@/components/ui/Button";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

/** 기본 화면 셸 — 헤더 + 콘텐츠 + 푸터 + 모바일 탭바. (에디터는 (editor) 레이아웃 사용) */
export default async function MainLayout({ children }: LayoutProps<"/">) {
  const me = await currentUser();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] w-full max-w-[1200px] items-center gap-7 px-6">
          <Link href="/" aria-label="백틱 홈" className="flex items-center">
            <span className="font-mono text-[30px] font-semibold leading-none text-acc transition hover:opacity-75">`</span>
          </Link>
          <nav className="hidden items-center gap-1 text-[14px] font-semibold text-sub sm:flex">
            <Link href="/" className="rounded-lg px-3 py-1.5 transition hover:bg-black/[.04] hover:text-ink">피드</Link>
            <Link href="/tags" className="rounded-lg px-3 py-1.5 transition hover:bg-black/[.04] hover:text-ink">태그</Link>
            <Link href="/sources" className="rounded-lg px-3 py-1.5 transition hover:bg-black/[.04] hover:text-ink">기업 블로그</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <form action="/search" className="relative hidden md:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">⌕</span>
              <input
                name="q"
                placeholder="검색"
                autoComplete="off"
                className="h-9 w-[200px] rounded-full border border-line bg-card pl-8 pr-3 text-[13px] font-medium outline-none transition placeholder:text-faint focus:w-[260px] focus:border-acc"
              />
            </form>
            {/* 모바일: 검색 아이콘으로 진입 */}
            <Link href="/search" aria-label="검색" className="flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-black/[.04] md:hidden">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <span className="hidden sm:block"><ButtonLink href="/write">글쓰기</ButtonLink></span>
            {me ? (
              <UserMenu name={me.name ?? me.email ?? "?"} image={imgProxy(me.image, "avatar", me.id)} handle={me.handle} />
            ) : (
              <Link href="/login" className="text-[13.5px] font-bold text-sub transition hover:text-ink">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t border-line py-8 pb-[calc(env(safe-area-inset-bottom)+96px)] sm:pb-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-2 px-6 text-center">
          <span className="font-mono text-[12px] tracking-[0.14em] text-faint">BACKTICK · 개발자의 글쓰기</span>
          <span className="text-[12.5px] font-medium text-muted">
            © 2026 백틱 · Built by{" "}
            <a
              href="https://github.com/theo-ooooo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sub hover:text-acc"
            >
              theo
            </a>
            <span className="mx-1.5 text-faint">·</span>
            <a href="mailto:kkw.theo@gmail.com" className="font-mono text-[12px] text-muted hover:text-acc">
              kkw.theo@gmail.com
            </a>
          </span>
        </div>
      </footer>

      <MobileTabBar handle={me?.handle ?? null} loggedIn={Boolean(me)} />
    </>
  );
}
