import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { PwaRegister } from "@/components/layout/PwaRegister";
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
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.NAVER_SITE_VERIFICATION ? { other: { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } } : {}),
  },
  appleWebApp: { capable: true, title: "백틱", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: "백틱 최신 글" }] },
  },
};

// 검색엔진·AI 크롤러용 사이트 정보 (AEO)
const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "백틱",
  alternateName: "Backtick",
  url: "https://backtick.blog",
  description:
    "한국 개발자를 위한 마크다운 블로그 플랫폼 + 기술블로그 큐레이션. 기업 기술블로그 새 글을 AI 요약과 함께 한 피드에서.",
  inLanguage: "ko",
};

/** 루트 레이아웃 — 공통 셸만. 화면 구성은 (main)/(editor) 라우트 그룹 레이아웃이 담당. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning className={`h-full antialiased ${codeFont.variable}`}>
      <head>
        <script
          // 페인트 전에 저장된 테마 적용 (다크모드 깜빡임 방지)
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("bt-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
        <PwaRegister />
        <ProgressBar />
        {children}
      </body>
    </html>
  );
}
