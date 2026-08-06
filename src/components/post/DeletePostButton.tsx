"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/lib/actions/post";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** 내 글 목록의 삭제 버튼 — 커스텀 확인 모달 후 하드 삭제. */
export function DeletePostButton({ postId, title }: { postId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[12px] font-semibold text-faint transition hover:text-acc"
      >
        삭제
      </button>
      <ConfirmDialog
        open={open}
        title="글을 삭제할까요?"
        message={`"${title || "제목 없음"}"\n댓글·좋아요도 함께 사라지고 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        danger
        pending={pending}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deletePost(postId);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
