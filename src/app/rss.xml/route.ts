import { getPublishedForIndex } from "@/lib/queries/post";

export const revalidate = 1800;

function esc(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** 네이티브 발행글 RSS — 리더/수집기/AI 크롤러용. */
export async function GET() {
  const posts = await getPublishedForIndex(30);
  const items = posts
    .map((p) => {
      const url = `https://backtick.blog/@${p.author.handle}/${encodeURIComponent(p.slug)}`;
      return `  <item>
    <title>${esc(p.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <author>${esc(p.author.name ?? p.author.handle ?? "")}</author>
    ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
    ${p.publishedAt ? `<pubDate>${p.publishedAt.toUTCString()}</pubDate>` : ""}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>백틱 — 개발자의 글쓰기</title>
  <link>https://backtick.blog</link>
  <description>마크다운 개발 블로그 플랫폼 백틱의 최신 글</description>
  <language>ko</language>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
