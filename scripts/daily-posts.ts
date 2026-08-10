import { prisma } from "../src/lib/prisma";

/** 매일 @theo 계정으로 개발 글 1편 자동 발행 — 크론이 하루 2회(오전/저녁) 실행한다.
 *  기존 글 제목과 겹치지 않는 주제를 고르고, 최근 수집 글의 트렌딩 태그를 참고한다. */

function toExcerpt(md: string, max = 160): string {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 80);
}

async function ai(messages: { role: string; content: string }[], maxTokens: number, temperature: number) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature, max_tokens: maxTokens, messages }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 필요");
  const user = await prisma.user.findUnique({ where: { handle: "theo" } });
  if (!user) throw new Error("theo 없음");

  // 중복 방지 재료: 기존 글 제목 + 최근 트렌딩 태그
  const [existing, tagRows] = await Promise.all([
    prisma.post.findMany({ where: { authorId: user.id }, select: { title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.$queryRaw<{ name: string }[]>`
      SELECT unnest(tags) AS name FROM external_posts
      WHERE "publishedAt" > now() - interval '14 days'
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,
  ]);
  const titles = existing.map((p) => p.title).join("\n");
  const trending = tagRows.map((t) => t.name).join(", ");

  // 1) 주제 선정
  const topicRaw = await ai(
    [
      {
        role: "system",
        content: "너는 백엔드/풀스택 개발자의 기술 블로그 주제 기획자다. 실무에서 겪을 법한 구체적 주제를 고른다.",
      },
      {
        role: "user",
        content: `요즘 개발 커뮤니티 트렌딩 키워드: ${trending}

이미 쓴 글 제목들 (겹치는 주제 금지):
${titles}

위와 겹치지 않는 새 블로그 글 주제를 1개만 골라줘. 형식(JSON만): {"title": "글 제목", "tags": ["태그1","태그2","태그3"]}
제목은 구체적이고 클릭하고 싶게 — "~하는 법" 나열보다 경험/의견/숫자가 있는 제목.`,
      },
    ],
    200,
    0.9,
  );
  const m = /\{[\s\S]*\}/.exec(topicRaw);
  if (!m) throw new Error(`주제 선정 실패: ${topicRaw.slice(0, 100)}`);
  const topic = JSON.parse(m[0]) as { title: string; tags: string[] };

  const slug = slugify(topic.title);
  const dupe = await prisma.post.findFirst({ where: { authorId: user.id, slug } });
  if (dupe) {
    console.log(`슬러그 중복 — 생략: ${topic.title}`);
    return;
  }

  // 2) 본문 작성
  const content = await ai(
    [
      {
        role: "system",
        content: `너는 한국 백엔드/풀스택 개발자다. 개발 블로그 글을 마크다운으로 쓴다.
- 문체: 담백한 평어체("~다"), 과장 금지, 실무 경험자의 시선
- 구성: 도입 2~3문장 → ## 섹션 3~4개 → 마무리(정리/원칙)
- 어울리는 곳에 코드블록(\`\`\`언어) 1~3개
- 전체 1300~1800자, 뻔한 교과서 설명 대신 트레이드오프와 함정 중심`,
      },
      { role: "user", content: `제목: ${topic.title}\n\n이 제목으로 블로그 글을 완성해줘. 제목은 본문에 다시 쓰지 마.` },
    ],
    2200,
    0.6,
  );
  if (content.length < 500) throw new Error("본문 생성 실패");

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      title: topic.title,
      slug,
      content,
      excerpt: toExcerpt(content),
      readMinutes: Math.max(1, Math.round(content.length / 700)),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  for (const name of topic.tags.slice(0, 4).map((t) => t.trim().toLowerCase()).filter(Boolean)) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug: encodeURIComponent(name.replace(/\s+/g, "-")) },
    });
    await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
  }
  console.log(`발행: ${topic.title} → /@theo/${slug}`);
}

main().then(() => process.exit(0));
