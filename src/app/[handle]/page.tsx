import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TagChip } from "@/components/ui/TagChip";

export const revalidate = 300;

async function getUser(handleParam: string) {
  const decoded = decodeURIComponent(handleParam);
  if (!decoded.startsWith("@")) return null;
  const handle = decoded.slice(1).toLowerCase();
  return prisma.user.findUnique({
    where: { handle },
    include: {
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        include: { tags: { include: { tag: true } } },
      },
    },
  });
}

export async function generateMetadata(props: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const user = await getUser(handle);
  if (!user) return {};
  return {
    title: `${user.name ?? user.handle} (@${user.handle})`,
    description: user.bio ?? undefined,
  };
}

export default async function BlogHome(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  const user = await getUser(handle);
  if (!user || !user.handle) notFound();

  return (
    <main className="mx-auto w-full max-w-[980px] px-6 py-10">
      <header className="flex items-start gap-6 border-b border-line pb-8">
        <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-paper text-[30px] font-extrabold text-sub">
          {(user.name ?? user.handle).charAt(0)}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">{user.name ?? user.handle}</h1>
            <span className="font-mono text-[13.5px] text-muted">@{user.handle}</span>
          </div>
          {user.bio && <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-sub">{user.bio}</p>}
          {user.githubUrl && (
            <a
              href={user.githubUrl.startsWith("http") ? user.githubUrl : `https://${user.githubUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-block font-mono text-[12.5px] font-medium text-muted hover:text-acc"
            >
              {user.githubUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </header>

      <div className="mt-2 border-b border-line pb-3 pt-4 text-[14px] font-bold">
        글 <span className="text-acc">{user.posts.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
        {user.posts.map((p) => (
          <Link key={p.id} href={`/@${user.handle}/${p.slug}`} className="group border-b border-line py-6">
            <div className="font-mono text-[11.5px] text-faint">
              {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10).replaceAll("-", ".")}
            </div>
            <h2 className="mt-1.5 text-[17px] font-extrabold leading-snug tracking-[-0.02em] group-hover:text-acc">
              {p.title}
            </h2>
            {p.excerpt && <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{p.excerpt}</p>}
            {p.tags.length > 0 && (
              <div className="mt-3 flex gap-1.5">
                {p.tags.slice(0, 3).map((t) => (
                  <TagChip key={t.tagId} name={t.tag.name} />
                ))}
              </div>
            )}
          </Link>
        ))}
        {user.posts.length === 0 && (
          <p className="col-span-2 py-20 text-center text-sm text-faint">아직 발행한 글이 없어요</p>
        )}
      </div>
    </main>
  );
}
