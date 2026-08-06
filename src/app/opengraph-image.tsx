import { ImageResponse } from "next/og";

export const alt = "백틱 — 개발자의 글쓰기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// satori 기본 폰트는 한글이 깨진다 — Pretendard Bold를 런타임에 로드
const fontPromise = fetch(
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
).then((r) => r.arrayBuffer());

/** 링크 공유 썸네일 (OG/트위터 카드) — 코드블록 카드 브랜드. */
export default async function OgImage() {
  const pretendard = await fontPromise;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f2ee",
          fontFamily: "Pretendard",
        }}
      >
        {/* 코드블록 카드 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 1040,
            height: 480,
            background: "#1b1a18",
            borderRadius: 28,
            boxShadow: "0 24px 60px rgba(26,24,21,.35)",
          }}
        >
          {/* mac chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 64,
              padding: "0 32px",
              background: "#242220",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ff5f57" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#febc2e" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#28c840" }} />
            <div style={{ display: "flex", marginLeft: 20, fontSize: 22, color: "#8a837c" }}>backtick.blog</div>
          </div>

          {/* 본문 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              padding: "0 72px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 120, color: "#e0533d", marginTop: -20 }}>`</div>
              <div style={{ display: "flex", fontSize: 96, color: "#ffffff", letterSpacing: -4 }}>백틱</div>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#b5aea6", marginTop: 8 }}>
              코드를 감싸는 기호처럼, 당신의 기록을 감싸는 곳
            </div>
            <div style={{ display: "flex", marginTop: 40, gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: "#e0533d",
                  color: "#ffffff",
                  fontSize: 24,
                }}
              >
                개발자의 글쓰기
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: "#2a2825",
                  color: "#b5aea6",
                  fontSize: 24,
                }}
              >
                기술블로그 큐레이션
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 700, style: "normal" }],
    },
  );
}
