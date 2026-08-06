"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/lib/actions/post";

/** 내 글 목록의 삭제 버튼 — confirm 후 하드 삭제. */
export function DeletePostButton({ postId, title }: { postId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`"${title || "제목 없음"}" 글을 삭제할까요?\n댓글·좋아요도 함께 사라지고 되돌릴 수 없어요.`)) return;
        startTransition(async () => {
          await deletePost(postId);
          router.refresh();
        });
      }}
      className="font-mono text-[12px] font-semibold text-faint transition hover:text-acc disabled:opacity-40"
    >
      {pending ? "삭제 중" : "삭제"}
    </button>
  );
}
