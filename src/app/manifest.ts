import type { MetadataRoute } from "next";

/** PWA 매니페스트 — 홈 화면 설치 시 앱처럼 실행. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "백틱 — 개발자의 글쓰기",
    short_name: "백틱",
    description: "국내 기술블로그 큐레이션 + AI 요약 + 마크다운 블로그",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1815",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
