import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { Markdown } from "@/components/markdown/Markdown";
import { TagChip } from "@/components/ui/TagChip";

export const revalidate = 300;

async function getPost(handleParam: string, slugParam: string) {
  const decoded = decodeURIComponent(handleParam);
  if (!decoded.startsWith("@")) return null;
  const handle = decoded.slice(1).toLowerCase();
  const slug = decodeURIComponent(slugParam);
  const author = await prisma.user.findUnique({ where: { handle } });
  if (!author) return null;
  const post = await prisma.post.findFirst({
    where: { authorId: author.id, slug, status: "PUBLISHED" },
    include: { author: true, tags: { include: { tag: true } } },
  });
  return post;
}

export async function generateMetadata(props: PageProps<"/[handle]/[slug]">): Promise<Metadata> {
  const { handle, slug } = await props.params;
  const post = await getPost(handle, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, description: post.excerpt ?? undefined, type: "article" },
  };
}

function readingMinutes(md: string): number {
  return Math.max(1, Math.round(md.length / 700));
}

export default async function PostPage(props: PageProps<"/[handle]/[slug]">) {
  const { handle, slug } = await props.params;
  const [post, me] = await Promise.all([getPost(handle, slug), currentUser()]);
  if (!post) notFound();
  const author = post.author;
  const mine = me?.id === author.id;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
      <div className="flex gap-10">
        <article className="min-w-0 max-w-[720px] flex-1">
          {post.tags.length > 0 && (
            <div className="mb-4 flex gap-1.5">
              {post.tags.map((t) => (
                <TagChip key={t.tagId} name={t.tag.name} />
              ))}
            </div>
          )}
          <h1 className="text-[32px] font-extrabold leading-[1.3] tracking-[-0.03em]">{post.title}</h1>
          <div className="mt-4 flex items-center gap-2.5 border-b border-line pb-6 text-[13px]">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-acc-soft text-[11px] font-extrabold text-acc">
              {(author.name ?? author.handle ?? "?").charAt(0)}
            </span>
            <Link href={`/@${author.handle}`} className="font-bold text-sub hover:text-acc">
              {author.name ?? author.handle}
            </Link>
            <span className="text-faint">
              · {(post.publishedAt ?? post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              · {readingMinutes(post.content)}분 읽기
            </span>
            {mine && (
              <Link href={`/write/${post.id}`} className="ml-auto font-mono text-[12px] font-semibold text-muted hover:text-acc">
                수정
              </Link>
            )}
          </div>

          <div className="pt-7">
            <Markdown content={post.content} />
          </div>
        </article>

        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-[84px] rounded-2xl border border-line p-5">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-paper text-[20px] font-extrabold text-sub">
              {(author.name ?? author.handle ?? "?").charAt(0)}
            </span>
            <div className="mt-3 text-[15.5px] font-extrabold">{author.name ?? author.handle}</div>
            <div className="font-mono text-[12px] text-muted">@{author.handle}</div>
            {author.bio && <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{author.bio}</p>}
            <Link
              href={`/@${author.handle}`}
              className="mt-4 block rounded-xl bg-ink px-4 py-2.5 text-center text-[13px] font-bold text-white transition hover:opacity-85"
            >
              글 더 보기
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
