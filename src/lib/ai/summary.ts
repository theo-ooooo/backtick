/** OpenAI로 3줄 요약 생성 — gpt-4o-mini (저렴·한국어 준수). */
export async function generateSummary(title: string, text: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "너는 한국 개발자 블로그 글을 요약하는 에디터다. 글의 핵심을 정확히 3줄로 요약한다. 각 줄은 '- '로 시작하고, 한 줄에 60자를 넘기지 않는다. 기술 용어는 원문 그대로 유지한다. 과장 없이 담백하게.",
        },
        {
          role: "user",
          content: `제목: ${title}\n\n본문:\n${text.slice(0, 8000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const out = json.choices?.[0]?.message?.content?.trim();
  return out || null;
}

/** 외부 글은 발췌(200자)뿐이라 원문을 가져와 본문 텍스트를 추출한다. */
export async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BacktickBot/1.0; +https://backtick.blog)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // 본문 우선 추출: article 태그 → 없으면 body 전체에서 스크립트/스타일 제거
    const articleMatch = /<article[\s\S]*?<\/article>/i.exec(html);
    const scope = articleMatch ? articleMatch[0] : html;
    const text = scope
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 200 ? text : null;
  } catch {
    return null;
  }
}
