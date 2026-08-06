import { ImageResponse } from "next/og";

export const alt = "백틱 — 개발자의 글쓰기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori 기본 폰트는 한글이 깨진다 — Pretendard Bold를 런타임에 로드
const fontPromise = fetch(
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
).then((r) => r.arrayBuffer());

/** 링크 공유 썸네일 — 파비콘과 동일한 미니멀 브랜드 (다크 + 코랄 백틱 획). */
export default async function OgImage() {
  const pretendard = await fontPromise;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1815",
          fontFamily: "Pretendard",
        }}
      >
        {/* 파비콘의 백틱 획 그대로, 크게 */}
        <svg width="300" height="300" viewBox="0 0 64 64" fill="none">
          <line x1="25" y1="16" x2="39" y2="38" stroke="#e0533d" strokeWidth="11" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", fontSize: 44, color: "#ffffff", letterSpacing: -1, marginTop: -10 }}>
          backtick.blog
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 700, style: "normal" }],
    },
  );
}
