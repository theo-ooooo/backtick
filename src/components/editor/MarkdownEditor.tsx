"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Markdown } from "@/components/markdown/Markdown";
import { useMarkdownEditor } from "@/hooks/useMarkdownEditor";
import { CoverPicker } from "./CoverPicker";
import { autosaveDraft } from "@/lib/actions/post";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  status?: string; // DRAFT | PUBLISHED — 발행글은 자동저장 안 함
  action: (formData: FormData) => Promise<void>;
}

/** 파일 → 최대 1400px webp data URL (본문 이미지용) */
async function fileToInline(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
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
export function MarkdownEditor({ postId, defaultTitle, defaultContent, defaultTags, defaultCover, saved, error, status, action }: Props) {
  const { content, setContent, onChange, isEmpty } = useMarkdownEditor(defaultContent ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState<"draft" | "continue" | null>(null);
  const [aiError, setAiError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [draftId, setDraftId] = useState(postId);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const lastSnapshotRef = useRef(`${defaultTitle ?? ""}\u0000${defaultContent ?? ""}`);
  const uploadSeq = useRef(0);
  // 발행된 글은 자동 저장 제외 (수정 내용이 라이브로 새면 안 됨)
  const autosaveEnabled = !postId || status === "DRAFT";

  // 자동 저장 — 3초 멈추면 초안 저장. 새 글이면 DRAFT 생성 후 URL 교체
  useEffect(() => {
    if (!autosaveEnabled) return;
    const t = setTimeout(async () => {
      const title = titleRef.current?.value.trim() ?? "";
      if (!title || !content.trim()) return;
      const snapshot = `${title}\u0000${content}`;
      if (snapshot === lastSnapshotRef.current) return;
      const res = await autosaveDraft({ id: draftId, title, content });
      if ("id" in res) {
        lastSnapshotRef.current = snapshot;
        setSavedAt(new Date(res.savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        if (!draftId) {
          setDraftId(res.id);
          window.history.replaceState(null, "", `/write/${res.id}`);
        }
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [content, draftId, autosaveEnabled]);

  // 본문 이미지 업로드 — 붙여넣기/드래그 → 리사이즈 → Storage → 마크다운 삽입
  const uploadInline = useCallback(
    async (files: FileList | File[]) => {
      const images = [...files].filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      setUploadErr("");
      for (const file of images) {
        const token = `![업로드 중…](uploading-${++uploadSeq.current})`;
        const ta = contentRef.current;
        const pos = ta ? ta.selectionStart : content.length;
        setContent((prev: string) => `${prev.slice(0, pos)}\n${token}\n${prev.slice(pos)}`);
        try {
          const dataUrl = await fileToInline(file);
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          const j = (await res.json()) as { url?: string; error?: string };
          if (res.ok && j.url) {
            setContent((prev: string) => prev.replace(token, `![](${j.url})`));
          } else {
            setContent((prev: string) => prev.replace(`\n${token}\n`, ""));
            setUploadErr(j.error ?? "이미지 업로드에 실패했어요");
          }
        } catch {
          setContent((prev: string) => prev.replace(`\n${token}\n`, ""));
          setUploadErr("이미지 업로드에 실패했어요");
        }
      }
    },
    [content.length, setContent],
  );
  const [suggestion, setSuggestion] = useState("");
  const suggestBusyRef = useRef(false);
  const lastSuggestLenRef = useRef(0);

  // 쓰다 멈추면(2.5초) 이어질 문장 자동 추천 — 직전 추천 이후 60자 이상 늘었을 때만
  useEffect(() => {
    if (!content.trim() || content.length < 120) return;
    if (Math.abs(content.length - lastSuggestLenRef.current) < 60) return;
    const timer = setTimeout(async () => {
      const title = titleRef.current?.value.trim();
      if (!title || suggestBusyRef.current) return;
      suggestBusyRef.current = true;
      lastSuggestLenRef.current = content.length;
      try {
        const res = await fetch("/api/ai/write", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "suggest", title, content }),
        });
        const j = (await res.json()) as { text?: string };
        if (res.ok && j.text) setSuggestion(j.text.trim());
      } catch {
        /* 추천 실패는 조용히 */
      } finally {
        suggestBusyRef.current = false;
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [content]);

  function applySuggestion() {
    if (!suggestion) return;
    setContent(`${content.trimEnd()} ${suggestion}`);
    setSuggestion("");
  }

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
      {draftId && <input type="hidden" name="id" value={draftId} />}
      <div className="flex items-center gap-3 border-b border-line px-6 py-3">
        <span className="font-mono text-[11px] text-faint">MARKDOWN</span>
        {aiError && <span className="text-[12px] font-semibold text-acc">{aiError}</span>}
        {uploadErr && <span className="text-[12px] font-semibold text-acc">{uploadErr}</span>}
        {savedAt && !saved && (
          <span className="font-mono text-[11px] text-faint">자동 저장됨 {savedAt}</span>
        )}
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

      {suggestion && (
        <div className="mx-6 mt-3 flex items-start gap-2.5 rounded-xl border border-acc/30 bg-acc-soft/50 px-4 py-3">
          <span className="mt-0.5 font-mono text-[12px] font-bold text-acc">💡</span>
          <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-relaxed text-ink">{suggestion}</p>
          <button type="button" onClick={applySuggestion} className="shrink-0 rounded-full bg-acc px-3 py-1 text-[12px] font-bold text-white transition hover:opacity-90">
            적용 (Tab)
          </button>
          <button type="button" onClick={() => setSuggestion("")} className="shrink-0 rounded-full px-2 py-1 text-[12px] font-semibold text-faint transition hover:text-sub">
            무시
          </button>
        </div>
      )}

      <div className="mt-4 grid min-h-[540px] flex-1 grid-cols-1 divide-line border-t border-line md:grid-cols-2 md:divide-x">
        <textarea
          ref={contentRef}
          name="content"
          value={content}
          onChange={onChange}
          onPaste={(e) => {
            if (e.clipboardData.files.length > 0) {
              e.preventDefault();
              void uploadInline(e.clipboardData.files);
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files.length > 0) {
              e.preventDefault();
              void uploadInline(e.dataTransfer.files);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Tab" && suggestion) {
              e.preventDefault();
              applySuggestion();
            }
          }}
          placeholder={"## 마크다운으로 작성하세요\n\n이미지는 붙여넣기/드래그로 바로 올라가요\n\n```ts\nconst hello = 'backtick';\n```"}
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

      {/* 하단 플로팅 AI 바 */}
      <div
        className="fixed inset-x-0 z-30 flex justify-center"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="flex items-center gap-1 rounded-full border border-black/[.06] bg-white/90 px-2 py-1.5 shadow-[0_10px_34px_rgba(26,24,21,.16),0_2px_8px_rgba(26,24,21,.08)] backdrop-blur-xl">
          <button
            type="button"
            disabled={aiBusy !== null || !isEmpty}
            onClick={() => aiWrite("draft")}
            title="빈 본문에서 제목으로 글 뼈대를 생성해요"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold text-sub transition hover:bg-acc-soft hover:text-acc disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-sub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e0533d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
            </svg>
            {aiBusy === "draft" ? "생성 중…" : "AI 초안"}
          </button>
          <span className="h-4 w-px bg-line" aria-hidden />
          <button
            type="button"
            disabled={aiBusy !== null || isEmpty}
            onClick={() => aiWrite("continue")}
            title="지금까지 쓴 흐름을 이어 다음 문단을 생성해요"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold text-sub transition hover:bg-acc-soft hover:text-acc disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-sub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e0533d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {aiBusy === "continue" ? "생성 중…" : "이어쓰기"}
          </button>
          <span className="h-4 w-px bg-line" aria-hidden />
          <button
            type="button"
            disabled={isEmpty}
            onClick={() => setResetOpen(true)}
            className="rounded-full px-3 py-2 text-[13px] font-semibold text-faint transition hover:text-acc disabled:opacity-35"
          >
            초기화
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="본문을 초기화할까요?"
        message="지금까지 쓴 내용이 모두 지워져요. 되돌릴 수 없어요."
        confirmLabel="초기화"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setContent("");
          setSuggestion("");
          setResetOpen(false);
        }}
      />
    </form>
  );
}
