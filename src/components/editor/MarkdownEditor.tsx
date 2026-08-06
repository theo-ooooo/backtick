"use client";

import { useRef, useState } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { useMarkdownEditor } from "@/hooks/useMarkdownEditor";
import { CoverPicker } from "./CoverPicker";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

interface Props {
  postId?: string;
  defaultTitle?: string;
  defaultContent?: string;
  defaultTags?: string;
  defaultCover?: string | null;
  saved?: boolean; // just returned from a draft save
  error?: string;
  action: (formData: FormData) => Promise<void>;
}

function SubmitButtons() {
  const { pending } = useFormStatus();
  return (
    <>
      <Button name="action" value="draft" variant="outline" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "임시저장"}
      </Button>
      <Button name="action" value="publish" variant="accent" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "발행하기"}
      </Button>
    </>
  );
}

/** Split markdown editor — left input / right live preview (design screen 03). */
export function MarkdownEditor({ postId, defaultTitle, defaultContent, defaultTags, defaultCover, saved, error, action }: Props) {
  const { content, setContent, onChange, isEmpty } = useMarkdownEditor(defaultContent ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState<"draft" | "continue" | null>(null);
  const [aiError, setAiError] = useState("");

  async function aiWrite(mode: "draft" | "continue") {
    const title = titleRef.current?.value.trim();
    if (!title) return setAiError("제목을 먼저 입력해주세요");
    setAiError("");
    setAiBusy(mode);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, title, content }),
      });
      const j = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !j.text) return setAiError(j.error ?? "생성에 실패했어요");
      setContent(mode === "draft" ? j.text : `${content.trimEnd()}\n\n${j.text}`);
    } catch {
      setAiError("생성에 실패했어요");
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {postId && <input type="hidden" name="id" value={postId} />}
      <div className="flex items-center gap-3 border-b border-line px-6 py-3">
        <span className="font-mono text-[11px] text-faint">MARKDOWN</span>
        <button
          type="button"
          disabled={aiBusy !== null || !isEmpty}
          onClick={() => aiWrite("draft")}
          title={!isEmpty ? "본문이 비어 있을 때 사용할 수 있어요" : undefined}
          className="rounded-full bg-acc-soft px-3 py-1 text-[12px] font-bold text-acc transition hover:bg-acc hover:text-white disabled:opacity-40 disabled:hover:bg-acc-soft disabled:hover:text-acc"
        >
          {aiBusy === "draft" ? "초안 생성 중…" : "✨ AI 초안"}
        </button>
        <button
          type="button"
          disabled={aiBusy !== null || isEmpty}
          onClick={() => aiWrite("continue")}
          className="rounded-full bg-acc-soft px-3 py-1 text-[12px] font-bold text-acc transition hover:bg-acc hover:text-white disabled:opacity-40 disabled:hover:bg-acc-soft disabled:hover:text-acc"
        >
          {aiBusy === "continue" ? "이어쓰는 중…" : "✍️ 이어쓰기"}
        </button>
        {aiError && <span className="text-[12px] font-bold text-acc">{aiError}</span>}
        {saved && (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#177245]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#28c840]" /> 임시저장됨 — 내 글에서 이어서 쓸 수 있어요
          </span>
        )}
        {error === "title" && <span className="text-[12px] font-bold text-acc">제목을 입력해주세요</span>}
        <div className="ml-auto flex items-center gap-2">
          <SubmitButtons />
        </div>
      </div>

      <div className="space-y-3 px-6 pt-5">
        <input
          ref={titleRef}
          name="title"
          defaultValue={defaultTitle}
          required
          placeholder="제목을 입력하세요"
          className="w-full bg-transparent text-[26px] font-extrabold tracking-[-0.03em] outline-none placeholder:text-faint"
        />
        <input
          name="tags"
          defaultValue={defaultTags}
          placeholder="태그를 입력하세요 (쉼표로 구분, 최대 5개)"
          className="w-full bg-transparent font-mono text-[13px] font-medium outline-none placeholder:text-faint"
        />
        <CoverPicker defaultCover={defaultCover} />
      </div>

      <div className="mt-4 grid min-h-[540px] flex-1 grid-cols-1 divide-line border-t border-line md:grid-cols-2 md:divide-x">
        <textarea
          name="content"
          value={content}
          onChange={onChange}
          placeholder={"## 마크다운으로 작성하세요\n\n```ts\nconst hello = 'backtick';\n```"}
          className="h-full min-h-[540px] w-full resize-none bg-white px-6 py-5 font-mono text-[13.5px] leading-relaxed outline-none placeholder:text-faint"
        />
        <div className="hidden overflow-y-auto px-6 py-5 md:block">
          <div className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-faint">PREVIEW</div>
          {!isEmpty ? (
            <Markdown content={content} />
          ) : (
            <p className="text-[13.5px] text-faint">왼쪽에 쓰면 여기에 미리보기가 떠요</p>
          )}
        </div>
      </div>
    </form>
  );
}
