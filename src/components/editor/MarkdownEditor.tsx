"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown/Markdown";

interface Props {
  postId?: string;
  defaultTitle?: string;
  defaultContent?: string;
  defaultTags?: string;
  action: (formData: FormData) => Promise<void>;
}

/** Split markdown editor — left input / right live preview (design screen 03). */
export function MarkdownEditor({ postId, defaultTitle, defaultContent, defaultTags, action }: Props) {
  const [content, setContent] = useState(defaultContent ?? "");

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {postId && <input type="hidden" name="id" value={postId} />}
      <div className="flex items-center gap-3 border-b border-line px-6 py-3">
        <span className="font-mono text-[11px] text-faint">MARKDOWN</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            name="action"
            value="draft"
            className="rounded-full border border-line bg-white px-4 py-1.5 text-[13px] font-bold text-sub transition hover:border-ink hover:text-ink"
          >
            임시저장
          </button>
          <button
            name="action"
            value="publish"
            className="rounded-full bg-acc px-4.5 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            발행하기
          </button>
        </div>
      </div>

      <div className="space-y-3 px-6 pt-5">
        <input
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
      </div>

      <div className="mt-4 grid min-h-[540px] flex-1 grid-cols-1 divide-line border-t border-line md:grid-cols-2 md:divide-x">
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"## 마크다운으로 작성하세요\n\n```ts\nconst hello = 'backtick';\n```"}
          className="h-full min-h-[540px] w-full resize-none bg-white px-6 py-5 font-mono text-[13.5px] leading-relaxed outline-none placeholder:text-faint"
        />
        <div className="hidden overflow-y-auto px-6 py-5 md:block">
          <div className="mb-3 font-mono text-[10.5px] tracking-[0.14em] text-faint">PREVIEW</div>
          {content ? (
            <Markdown content={content} />
          ) : (
            <p className="text-[13.5px] text-faint">왼쪽에 쓰면 여기에 미리보기가 떠요</p>
          )}
        </div>
      </div>
    </form>
  );
}
