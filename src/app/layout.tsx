import type { Metadata } from "next";
import Link from "next/link";
import { Source_Code_Pro } from "next/font/google";
import { currentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/Button";
import { UserMenu } from "@/components/layout/UserMenu";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import "./globals.css";

const codeFont = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://backtick.blog"),
  title: { default: "백틱 — 개발자의 글쓰기", template: "%s | 백틱" },
  description:
    "코드를 감싸는 기호처럼, 당신의 기록을 감싸는 곳. 마크다운으로 글을 쓰고 국내 기술블로그 소식을 한곳에서 받아보세요.",
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await currentUser();
  return (
    <html lang="ko" className={`h-full antialiased ${codeFont.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ProgressBar />
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-[60px] w-full max-w-[1200px] items-center gap-7 px-6">
            <Link href="/" className="flex items-baseline gap-[3px]">
              <span className="font-mono text-[22px] font-semibold leading-none text-acc">`</span>
              <span className="text-[19px] font-extrabold leading-none tracking-[-0.035em]">백틱</span>
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
              <span className="hidden sm:block"><ButtonLink href="/write">글쓰기</ButtonLink></span>
              {me ? (
                <UserMenu name={me.name ?? me.email ?? "?"} image={me.image} handle={me.handle} />
              ) : (
                <Link href="/login" className="text-[13.5px] font-bold text-sub transition hover:text-ink">
                  로그인
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
        <div className="h-[92px] sm:hidden" aria-hidden />
        <footer className="mt-auto border-t border-line py-8">
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
      </body>
    </html>
  );
}
