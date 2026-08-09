import { prisma } from "../src/lib/prisma";

/** 주간 기술블로그 트렌드 리포트 — 지난 7일 수집글을 AI가 분석해 백틱 공식 계정으로 발행. */

function toExcerpt(md: string, max = 160): string {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function weekLabel(d: Date): string {
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const month = kst.getMonth() + 1;
  const week = Math.ceil(kst.getDate() / 7);
  return `${month}월 ${week}주차`;
}

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY 필요");

  // 공식 계정 확보
  const official = await prisma.user.upsert({
    where: { handle: "backtick" },
    update: {},
    create: {
      handle: "backtick",
      name: "백틱",
      email: "official@backtick.blog",
      bio: "백틱 공식 계정 — 매주 국내 기술블로그 트렌드를 정리해 드려요.",
    },
  });

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const posts = await prisma.externalPost.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    select: { title: true, url: true, tags: true, likes: true, feed: { select: { name: true } } },
    take: 150,
  });
  if (posts.length < 10) {
    console.log(`이번 주 수집글 ${posts.length}건 — 리포트 생략`);
    return;
  }

  const list = posts
    .map((p) => `- [${p.feed.name}] ${p.title}${p.likes ? ` (♥${p.likes})` : ""} | ${p.url} | ${p.tags.slice(0, 3).join(",")}`)
    .join("\n");

  const label = weekLabel(new Date());
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 2200,
      messages: [
        {
          role: "system",
          content: `너는 한국 개발자 커뮤니티의 기술 큐레이터다. 마크다운으로 쓴다. 담백한 평어체("~다"). 과장 금지.`,
        },
        {
          role: "user",
          content: `지난 7일간 국내 기술블로그에서 수집된 글 목록이다. "주간 기술블로그 트렌드" 리포트를 써줘.

구성:
1. 도입 2~3문장 — 이번 주 전체 흐름 요약
2. ## 주요 테마 3~4개 — 각 테마마다 흐름 설명 2~3문장 + 관련 글을 [제목](URL) 링크 리스트로 (출처 회사명 표기)
3. ## 놓치면 아쉬운 글 — 테마에 안 묶였지만 좋은 글 3~5개, 한 줄 코멘트와 함께
4. 마무리 1~2문장

규칙: 목록에 있는 URL만 사용. 링크는 반드시 마크다운 형식. 전체 1500자 내외.

수집 글 목록:
${list}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content || content.length < 300) throw new Error("리포트 생성 실패");

  const title = `주간 기술블로그 트렌드 — ${label}`;
  const slug = `weekly-trends-${new Date().toISOString().slice(0, 10)}`;
  const dupe = await prisma.post.findFirst({ where: { authorId: official.id, slug } });
  if (dupe) {
    console.log("이번 주 리포트 이미 발행됨 — 생략");
    return;
  }

  const post = await prisma.post.create({
    data: {
      authorId: official.id,
      title,
      slug,
      content,
      excerpt: toExcerpt(content),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  for (const name of ["주간트렌드", "큐레이션"]) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug: encodeURIComponent(name) },
    });
    await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
  }
  // 썸네일 — 글 페이지의 OG 이미지를 받아 Storage에 올려 커버로 사용
  try {
    const pageUrl = `https://backtick.blog/@backtick/${slug}`;
    const html = await (await fetch(pageUrl)).text();
    const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
    if (og) {
      const png = Buffer.from(await (await fetch(og)).arrayBuffer());
      const secret = process.env.UPLOAD_SECRET;
      if (secret) {
        const up = await fetch("https://eoassqhvtplpobndyhie.supabase.co/functions/v1/img-upload", {
          method: "POST",
          headers: { "content-type": "application/json", "x-upload-secret": secret },
          body: JSON.stringify({
            dataUrl: `data:image/png;base64,${png.toString("base64")}`,
            path: `posts/weekly-trends/cover-${new Date().toISOString().slice(0, 10)}`,
          }),
        });
        const { url } = (await up.json()) as { url?: string };
        if (url) await prisma.post.update({ where: { id: post.id }, data: { coverImage: url } });
      }
    }
  } catch {
    /* 커버는 실패해도 발행은 유지 */
  }

  console.log(`발행 완료: ${title} → /@backtick/${slug} (수집글 ${posts.length}건 분석)`);
}

main().then(() => process.exit(0));
