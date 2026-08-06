import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { savePost } from "@/lib/actions/post";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

export const metadata: Metadata = { title: "글쓰기" };

export default async function WritePage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!me.handle) redirect("/settings?error=handle");

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col">
      <MarkdownEditor action={savePost} />
    </main>
  );
}
