"use client";

import { useCallback, useState } from "react";

/** 에디터 클라이언트 상태 — 본문과 파생값(글자 수)을 페이지/컴포넌트 밖에서 관리. */
export function useMarkdownEditor(initialContent = "") {
  const [content, setContent] = useState(initialContent);

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  return { content, onChange, charCount: content.length, isEmpty: content.trim().length === 0 };
}
