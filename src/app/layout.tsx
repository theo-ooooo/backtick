import type { Metadata } from "next";
import Link from "next/link";
import { Source_Code_Pro } from "next/font/google";
import { currentUser } from "@/lib/auth";
import "./globals.css";

const codeFont = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: { default: "백틱 — 개발자의 글쓰기", template: "%s | 백틱" },
  description:
    "코드를 감싸는 기호처럼, 당신의 기록을 감싸는 곳. 마크다운으로 글을 쓰고 국내 기술블로그 소식을 한곳에서 받아보세요.",
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
              <Link
                href="/write"
                className="rounded-full bg-ink px-4.5 py-2 text-[13.5px] font-bold text-white transition hover:opacity-85"
              >
                글쓰기
              </Link>
              {me ? (
                <>
                  <Link href="/posts" className="hidden text-[13.5px] font-bold text-sub transition hover:text-ink sm:block">
                    내 글
                  </Link>
                  <Link
                    href={me.handle ? `/@${me.handle}` : "/settings"}
                    title={me.name ?? undefined}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-acc-soft text-[13px] font-extrabold text-acc transition hover:opacity-80"
                  >
                    {(me.name ?? me.email ?? "?").charAt(0)}
                  </Link>
                </>
              ) : (
                <Link href="/login" className="text-[13.5px] font-bold text-sub transition hover:text-ink">
                  로그인
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-line py-8 text-center">
          <span className="font-mono text-[12px] tracking-[0.14em] text-faint">BACKTICK · 개발자의 글쓰기</span>
        </footer>
      </body>
    </html>
  );
}
