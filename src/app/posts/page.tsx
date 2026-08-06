import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "내 글" };

export default async function MyPostsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");

  const posts = await prisma.post.findMany({
    where: { authorId: me.id },
    orderBy: { updatedAt: "desc" },
  });
  const drafts = posts.filter((p) => p.status === "DRAFT");
  const published = posts.filter((p) => p.status === "PUBLISHED");

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">내 글</h1>

      <section className="mt-8">
        <h2 className="mb-2 border-b border-line pb-2.5 text-[14px] font-bold">
          임시저장 <span className="text-acc">{drafts.length}</span>
        </h2>
        <ul className="divide-y divide-line/70">
          {drafts.map((p) => (
            <li key={p.id}>
              <Link href={`/write/${p.id}`} className="group flex items-baseline gap-3 py-4">
                <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold group-hover:text-acc">
                  {p.title || "(제목 없음)"}
                </span>
                <span className="font-mono text-[11.5px] text-faint">{timeAgo(p.updatedAt)} 수정</span>
                <span className="font-mono text-[12px] font-semibold text-acc">이어서 쓰기 →</span>
              </Link>
            </li>
          ))}
          {drafts.length === 0 && <li className="py-8 text-center text-[13px] text-faint">임시저장한 글이 없어요</li>}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-2 border-b border-line pb-2.5 text-[14px] font-bold">
          발행됨 <span className="text-acc">{published.length}</span>
        </h2>
        <ul className="divide-y divide-line/70">
          {published.map((p) => (
            <li key={p.id} className="flex items-baseline gap-3 py-4">
              <Link
                href={`/@${me.handle}/${p.slug}`}
                className="min-w-0 flex-1 truncate text-[15.5px] font-bold hover:text-acc"
              >
                {p.title}
              </Link>
              <span className="font-mono text-[11.5px] text-faint">{timeAgo(p.publishedAt ?? p.updatedAt)}</span>
              <Link href={`/write/${p.id}`} className="font-mono text-[12px] font-semibold text-muted hover:text-acc">
                수정
              </Link>
            </li>
          ))}
          {published.length === 0 && <li className="py-8 text-center text-[13px] text-faint">발행한 글이 없어요</li>}
        </ul>
      </section>
    </main>
  );
}
