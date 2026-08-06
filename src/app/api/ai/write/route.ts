import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const SYSTEM = `너는 한국 개발 블로그 전문 에디터다. 마크다운으로 쓴다.
- 문체: 존댓말이 아닌 담백한 평어체("~다"), 과장 없이
- 코드가 어울리는 주제면 \`\`\`언어 코드블록을 포함한다
- 섹션 제목은 ## 를 쓴다`;

/** AI 글쓰기 어시스트 — mode: "draft"(제목→초안) | "continue"(이어쓰기). 로그인 필수(비용 가드). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI 미설정" }, { status: 503 });

  const { mode, title, content } = (await req.json().catch(() => ({}))) as {
    mode?: string;
    title?: string;
    content?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: "제목을 먼저 입력해주세요" }, { status: 400 });

  const user =
    mode === "suggest"
      ? `제목: ${title}\n\n쓰는 중인 글:\n${(content ?? "").slice(-3000)}\n\n마지막 문장에 자연스럽게 이어질 다음 문장 1~2개만 써줘. 새 섹션 제목 없이 본문 문장만. 80자 이내.`
      : mode === "continue"
      ? `제목: ${title}\n\n지금까지 쓴 글:\n${(content ?? "").slice(-6000)}\n\n위 글에 자연스럽게 이어질 다음 내용을 1~2개 문단(필요하면 섹션 제목 포함)으로 써줘. 지금까지의 문체와 흐름을 유지하고, 이미 한 말은 반복하지 마.`
      : `제목: ${title}\n\n이 제목으로 개발 블로그 글의 초안을 써줘. 구성: 도입 1문단 → ## 섹션 2~3개(각 2~3문단, 어울리면 코드 예시) → 마무리 1문단. 전체 1000자 내외. 글쓴이가 살을 붙일 수 있는 뼈대로.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: mode === "suggest" ? 150 : 1200,
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return NextResponse.json({ error: "생성에 실패했어요" }, { status: 502 });
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) return NextResponse.json({ error: "생성에 실패했어요" }, { status: 502 });
  return NextResponse.json({ text });
}
