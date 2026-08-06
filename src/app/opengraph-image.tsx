import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "백틱 — 개발자의 글쓰기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 링크 공유 썸네일 (OG/트위터 카드) — 다크 + 코랄 백틱 브랜드. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1b1a18",
          color: "#e8e4de",
          fontFamily: "monospace",
        }}
      >
        {/* mac chrome dots */}
        <div style={{ display: "flex", gap: 12, position: "absolute", top: 44, left: 48 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ff5f57" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#febc2e" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#28c840" }} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 130, color: "#e0533d", fontWeight: 700 }}>`</div>
          <div style={{ fontSize: 110, fontWeight: 800, color: "#ffffff", letterSpacing: -4 }}>백틱</div>
        </div>

        <div style={{ display: "flex", fontSize: 38, color: "#8a837c", marginTop: 12 }}>
          코드를 감싸는 기호처럼, 당신의 기록을 감싸는 곳
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#e0533d", marginTop: 48 }}>backtick.blog</div>
      </div>
    ),
    size,
  );
}
