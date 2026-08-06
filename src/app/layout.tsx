import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import { ProgressBar } from "@/components/layout/ProgressBar";
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

/** 루트 레이아웃 — 공통 셸만. 화면 구성은 (main)/(editor) 라우트 그룹 레이아웃이 담당. */
export default function RootLayout({ children }: LayoutProps<"/">) {
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
        {children}
      </body>
    </html>
  );
}
