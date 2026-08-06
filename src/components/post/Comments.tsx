"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommentView } from "@/lib/queries/comment";
import { addComment, deleteComment } from "@/lib/actions/comment";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/format";

interface Props {
  postId: string;
  comments: CommentView[];
  count: number;
  meId: string | null;
  hideHeading?: boolean;
}

/** 댓글 섹션 — 2뎁스 고정, 답글의 답글은 "누구님에게"로 표시. */
export function Comments({ postId, comments, count, meId, hideHeading = false }: Props) {
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  return (
    <section className={hideHeading ? "mt-2" : "mt-12"}>
      {!hideHeading && (
        <h2 className="border-b border-line pb-3 text-[16px] font-extrabold">
          댓글 <span className="text-acc">{count}</span>
        </h2>
      )}

      <CommentForm postId={postId} loggedIn={Boolean(meId)} onDone={() => router.refresh()} />

      <ul className="mt-2 space-y-1">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-line/60 py-4 last:border-0">
            <CommentItem
              c={c}
              meId={meId}
              onReply={() => setReplyTo({ id: c.id, name: c.authorName })}
              onChanged={() => router.refresh()}
            />
            {(c.replies.length > 0 || replyTo?.id === c.id || c.replies.some((r) => r.id === replyTo?.id)) && (
              <div className="mt-3 space-y-3 border-l-2 border-line pl-4 sm:ml-9">
                {c.replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    c={r}
                    meId={meId}
                    onReply={() => setReplyTo({ id: r.id, name: r.authorName })}
                    onChanged={() => router.refresh()}
                  />
                ))}
                {(replyTo?.id === c.id || c.replies.some((r) => r.id === replyTo?.id)) && (
                  <CommentForm
                    postId={postId}
                    parentId={replyTo!.id}
                    placeholder={`${replyTo!.name}님에게 답글 쓰기`}
                    loggedIn={Boolean(meId)}
                    autoFocus
                    onDone={() => {
                      setReplyTo(null);
                      router.refresh();
                    }}
                    onCancel={() => setReplyTo(null)}
                  />
                )}
              </div>
            )}
          </li>
        ))}
        {comments.length === 0 && (
          <li className="py-10 text-center text-[13px] text-faint">첫 댓글을 남겨보세요</li>
        )}
      </ul>
    </section>
  );
}

function CommentItem({
  c,
  meId,
  onReply,
  onChanged,
}: {
  c: CommentView;
  meId: string | null;
  onReply: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();

  if (c.deleted) {
    return <p className="text-[13.5px] italic text-faint">삭제된 댓글이에요</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Avatar name={c.authorName} image={c.authorImage} size="sm" />
        <span className="text-[13.5px] font-bold text-sub">{c.authorName}</span>
        <span className="font-mono text-[11px] text-faint">{timeAgo(c.createdAt)}</span>
        {meId === c.authorId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => {
              await deleteComment(c.id);
              onChanged();
            })}
            className="ml-auto font-mono text-[11px] text-faint transition hover:text-acc"
          >
            삭제
          </button>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">
        {c.replyToName && <span className="mr-1.5 font-bold text-acc">@{c.replyToName}</span>}
        {c.content}
      </p>
      <button type="button" onClick={onReply} className="mt-1.5 text-[12px] font-bold text-muted transition hover:text-acc">
        답글
      </button>
    </div>
  );
}

function CommentForm({
  postId,
  parentId,
  placeholder = "댓글을 남겨보세요",
  loggedIn,
  autoFocus,
  onDone,
  onCancel,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  loggedIn: boolean;
  autoFocus?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!loggedIn && !parentId) {
    return (
      <a href="/login" className="mt-4 block rounded-xl border border-dashed border-line py-4 text-center text-[13.5px] font-bold text-muted transition hover:border-acc hover:text-acc">
        로그인하고 댓글 쓰기
      </a>
    );
  }

  function submit() {
    if (!loggedIn) {
      window.location.href = "/login";
      return;
    }
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await addComment({ postId, content: value, parentId });
      if (!res.ok) setError(res.error);
      else {
        setValue("");
        setError("");
        onDone();
      }
    });
  }

  return (
    <div className="mt-4">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={1000}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium leading-relaxed outline-none placeholder:text-faint focus:border-acc"
      />
      <div className="mt-2 flex items-center gap-2">
        {error && <span className="text-[12.5px] font-bold text-acc">{error}</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className="ml-auto rounded-full border border-line px-4 py-1.5 text-[13px] font-bold text-sub">
            취소
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          className={`${onCancel ? "" : "ml-auto"} rounded-full bg-ink px-4.5 py-1.5 text-[13px] font-bold text-white transition hover:opacity-85 disabled:opacity-40`}
        >
          {parentId ? "답글 등록" : "등록"}
        </button>
      </div>
    </div>
  );
}
