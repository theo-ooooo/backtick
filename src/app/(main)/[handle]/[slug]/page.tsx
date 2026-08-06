import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getPublishedPost, hasLiked } from "@/lib/queries/post";
import { PostActions } from "@/components/post/PostActions";
import { CommentsSheet } from "@/components/post/CommentsSheet";
import { getComments, countComments } from "@/lib/queries/comment";
import { Markdown } from "@/components/markdown/Markdown";
import { TagChip } from "@/components/ui/TagChip";
import { Avatar } from "@/components/ui/Avatar";
import { AuthorCard } from "@/components/post/AuthorCard";

export const revalidate = 300;

export async function generateMetadata(props: PageProps<"/[handle]/[slug]">): Promise<Metadata> {
  const { handle, slug } = await props.params;
  const post = await getPublishedPost(handle, slug);
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
  const [post, me] = await Promise.all([getPublishedPost(handle, slug), currentUser()]);
  if (!post) notFound();
  const author = post.author;
  const mine = me?.id === author.id;
  const [liked, comments, commentCount] = await Promise.all([
    hasLiked(post.id, me?.id),
    getComments(post.id),
    countComments(post.id),
  ]);

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
            <Avatar name={author.name ?? author.handle ?? "?"} image={author.image} size="sm" />
            <Link href={`/@${author.handle}`} className="font-bold text-sub hover:text-acc">
              {author.name ?? author.handle}
            </Link>
            <span className="text-faint">
              · {(post.publishedAt ?? post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              · 읽는 데 약 {readingMinutes(post.content)}분
            </span>
            {mine && (
              <Link href={`/write/${post.id}`} className="ml-auto font-mono text-[12px] font-semibold text-muted hover:text-acc">
                수정
              </Link>
            )}
          </div>

          <PostActions
            postId={post.id}
            views={post.views}
            likeCount={post._count.likes}
            liked={liked}
            loggedIn={Boolean(me)}
          />

          <div className="pt-7">
            <Markdown content={post.content} />
          </div>

          <CommentsSheet postId={post.id} comments={comments} count={commentCount} meId={me?.id ?? null} />
        </article>

        <aside className="hidden w-[260px] shrink-0 lg:block">
          <AuthorCard author={author} />
        </aside>
      </div>
    </main>
  );
}
