import Link from "next/link";
import type { Post } from "@prisma/client";
import { timeAgo } from "@/lib/format";
import { DeletePostButton } from "./DeletePostButton";

/** 내 글 목록 한 줄 — 임시저장(이어서 쓰기)과 발행됨(보기/수정) 겸용. */
export function PostRow({ post, handle }: { post: Post; handle: string | null }) {
  const draft = post.status === "DRAFT";
  return (
    <div className="flex items-baseline gap-3 py-4">
      <Link
        href={draft ? `/write/${post.id}` : `/@${handle}/${post.slug}`}
        className="min-w-0 flex-1 truncate text-[15.5px] font-bold hover:text-acc"
      >
        {post.title || "(제목 없음)"}
      </Link>
      <span className="font-mono text-[11.5px] text-faint">
        {timeAgo(draft ? post.updatedAt : post.publishedAt ?? post.updatedAt)}
        {draft && " 수정"}
      </span>
      <Link
        href={`/write/${post.id}`}
        className={`font-mono text-[12px] font-semibold ${draft ? "text-acc" : "text-muted hover:text-acc"}`}
      >
        {draft ? "이어서 쓰기 →" : "수정"}
      </Link>
      <DeletePostButton postId={post.id} title={post.title} />
    </div>
  );
}
