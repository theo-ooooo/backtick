import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserWithPosts } from "@/lib/queries/user";
import { TagChip } from "@/components/ui/TagChip";
import { Avatar } from "@/components/ui/Avatar";

export const revalidate = 300;

export async function generateMetadata(props: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const user = await getUserWithPosts(handle);
  if (!user) return {};
  return {
    title: `${user.name ?? user.handle} (@${user.handle})`,
    description: user.bio ?? undefined,
  };
}

export default async function BlogHome(props: PageProps<"/[handle]">) {
  const { handle } = await props.params;
  const user = await getUserWithPosts(handle);
  if (!user || !user.handle) notFound();

  return (
    <main className="mx-auto w-full max-w-[980px] px-6 py-10">
      <header className="flex items-start gap-6 border-b border-line pb-8">
        <Avatar name={user.name ?? user.handle} image={user.image} size="xl" tone="neutral" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">{user.name ?? user.handle}</h1>
            <span className="font-mono text-[13.5px] text-muted">@{user.handle}</span>
          </div>
          {user.bio && <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-sub">{user.bio}</p>}
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {[user.githubUrl, user.websiteUrl].filter(Boolean).map((url) => {
              const isGithub = url!.includes("github.com");
              return (
                <a
                  key={url}
                  href={url!.startsWith("http") ? url! : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-muted transition hover:text-acc"
                >
                  {isGithub ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                      <circle cx="8" cy="8" r="6.4" />
                      <path d="M1.6 8h12.8M8 1.6c1.9 1.7 2.9 4 2.9 6.4S9.9 12.7 8 14.4M8 1.6C6.1 3.3 5.1 5.6 5.1 8s1 4.7 2.9 6.4" />
                    </svg>
                  )}
                  {url!.replace(/^https?:\/\//, "")}
                </a>
              );
            })}
          </div>
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
