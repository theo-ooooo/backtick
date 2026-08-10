import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

async function getCollection(handleParam: string, slug: string) {
  const handle = decodeURIComponent(handleParam).replace(/^@/, "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { handle }, select: { id: true, name: true, handle: true } });
  if (!user) return null;
  const collection = await prisma.collection.findFirst({
    where: { userId: user.id, slug: decodeURIComponent(slug) },
    include: {
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "asc" },
        select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, createdAt: true },
      },
    },
  });
  return collection ? { user, collection } : null;
}

export async function generateMetadata(props: PageProps<"/[handle]/collections/[slug]">): Promise<Metadata> {
  const { handle, slug } = await props.params;
  const data = await getCollection(handle, slug);
  if (!data) return {};
  return { title: `${data.collection.name} — ${data.user.name ?? data.user.handle}` };
}

export default async function CollectionPage(props: PageProps<"/[handle]/collections/[slug]">) {
  const { handle, slug } = await props.params;
  const data = await getCollection(handle, slug);
  if (!data) notFound();
  const { user, collection } = data;

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-10">
      <Link href={`/@${user.handle}?tab=collections`} className="font-mono text-[12.5px] font-semibold text-muted hover:text-acc">
        ← 컬렉션
      </Link>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-[22px] text-acc">＃</span>
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{collection.name}</h1>
        <span className="ml-1 font-mono text-[13px] text-faint">{collection.posts.length}편</span>
      </div>
      {collection.description && <p className="mt-2 text-[14.5px] text-muted">{collection.description}</p>}

      <ol className="mt-6 divide-y divide-line/70">
        {collection.posts.map((p, i) => (
          <li key={p.id}>
            <Link href={`/@${user.handle}/${encodeURIComponent(p.slug)}`} className="group flex items-baseline gap-3 py-4">
              <span className="w-6 shrink-0 font-mono text-[13px] font-bold text-faint">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15.5px] font-extrabold text-ink group-hover:text-acc">{p.title}</h2>
                {p.excerpt && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{p.excerpt}</p>}
              </div>
              <span className="shrink-0 font-mono text-[11.5px] text-faint">
                {(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10).replaceAll("-", ".")}
              </span>
            </Link>
          </li>
        ))}
        {collection.posts.length === 0 && <li className="py-16 text-center text-sm text-faint">아직 글이 없어요</li>}
      </ol>
    </main>
  );
}
