import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostRow } from "@/components/post/PostRow";

export const metadata: Metadata = { title: "내 글" };

export default async function MyPostsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");

  const posts = await prisma.post.findMany({
    where: { authorId: me.id },
    orderBy: { updatedAt: "desc" },
  });
  const sections = [
    { label: "임시저장", posts: posts.filter((p) => p.status === "DRAFT"), empty: "임시저장한 글이 없어요" },
    { label: "발행됨", posts: posts.filter((p) => p.status === "PUBLISHED"), empty: "발행한 글이 없어요" },
  ];

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">내 글</h1>
      {sections.map((s) => (
        <section key={s.label} className="mt-8">
          <h2 className="mb-2 border-b border-line pb-2.5 text-[14px] font-bold">
            {s.label} <span className="text-acc">{s.posts.length}</span>
          </h2>
          <ul className="divide-y divide-line/70">
            {s.posts.map((p) => (
              <li key={p.id}>
                <PostRow post={p} handle={me.handle} />
              </li>
            ))}
            {s.posts.length === 0 && <li className="py-8 text-center text-[13px] text-faint">{s.empty}</li>}
          </ul>
        </section>
      ))}
    </main>
  );
}
