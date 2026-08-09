"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions/user";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** 회원 탈퇴 — 위험 구역. 확인 모달을 거쳐 계정과 모든 데이터를 삭제한다. */
export function DeleteAccount({ postCount }: { postCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mt-12 rounded-2xl border border-acc/25 bg-acc-soft/30 px-6 py-5">
      <h2 className="text-[14.5px] font-extrabold text-ink">회원 탈퇴</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        계정과 함께 글 {postCount}개, 댓글, 좋아요가 모두 삭제되고 되돌릴 수 없어요.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3.5 rounded-xl border border-acc/40 bg-card px-4 py-2.5 text-[13.5px] font-bold text-acc transition hover:bg-acc hover:text-white"
      >
        탈퇴하기
      </button>

      <ConfirmDialog
        open={open}
        title="정말 탈퇴할까요?"
        message={`글 ${postCount}개를 포함한 모든 데이터가 즉시 삭제되고 복구할 수 없어요.`}
        confirmLabel="탈퇴"
        danger
        pending={pending}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            await deleteAccount();
          });
        }}
      />
    </section>
  );
}
