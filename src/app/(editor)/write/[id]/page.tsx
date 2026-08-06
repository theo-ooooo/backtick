import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getMyPost } from "@/lib/queries/post";
import { savePost } from "@/lib/actions/post";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

export const metadata: Metadata = { title: "글 수정" };

export default async function EditPage(props: PageProps<"/write/[id]">) {
  const me = await currentUser();
  if (!me) redirect("/login");
  const { id } = await props.params;
  const { saved, error } = await props.searchParams;
  const post = await getMyPost(me.id, id);
  if (!post) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col">
      <MarkdownEditor
        postId={post.id}
        defaultTitle={post.title}
        defaultContent={post.content}
        defaultTags={post.tags.map((t) => t.tag.name).join(", ")}
        defaultCover={post.coverImage}
        saved={saved === "1"}
        error={typeof error === "string" ? error : undefined}
        action={savePost}
      />
    </main>
  );
}
