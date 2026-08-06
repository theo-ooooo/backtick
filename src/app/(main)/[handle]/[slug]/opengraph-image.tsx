import { ImageResponse } from "next/og";
import { getPublishedPost } from "@/lib/queries/post";

export const alt = "백틱 글";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontPromise = fetch(
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
).then((r) => r.arrayBuffer());

/** 글별 공유 썸네일 — 다크 브랜드 카드에 글 제목. */
export default async function PostOgImage(props: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await props.params;
  const [pretendard, post] = await Promise.all([fontPromise, getPublishedPost(handle, slug)]);

  const title = post?.title ?? "백틱 — 개발자의 글쓰기";
  const author = post ? `@${post.author.handle}` : "backtick.blog";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#1a1815",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
            <line x1="25" y1="16" x2="39" y2="38" stroke="#e0533d" strokeWidth="11" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 28, color: "#8a837c" }}>backtick.blog</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 56 : 66,
            color: "#ffffff",
            letterSpacing: -2,
            lineHeight: 1.25,
            maxWidth: 1040,
          }}
        >
          {title.length > 70 ? `${title.slice(0, 70)}…` : title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#e0533d" }}>{author}</div>
          <div style={{ display: "flex", fontSize: 26, color: "#55504a" }}>· 개발자의 글쓰기, 백틱</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 700, style: "normal" }],
    },
  );
}
