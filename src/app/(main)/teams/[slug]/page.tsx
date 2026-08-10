import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { imgProxy } from "@/lib/img";
import { toFeedItem, feedPostSelect } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { FeedList } from "@/components/feed/FeedList";
import { InviteMember } from "@/components/team/InviteMember";

export const revalidate = 120;

async function getTeam(slug: string) {
  return prisma.team.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, handle: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

export async function generateMetadata(props: PageProps<"/teams/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const team = await getTeam(slug);
  return team ? { title: `${team.name} — 팀` } : {};
}

export default async function TeamPage(props: PageProps<"/teams/[slug]">) {
  const { slug } = await props.params;
  const [team, me] = await Promise.all([getTeam(slug), currentUser()]);
  if (!team) notFound();

  const memberIds = team.members.map((m) => m.userId);
  const isOwner = team.members.some((m) => m.userId === me?.id && m.role === "owner");

  const posts = await prisma.post.findMany({
    where: { authorId: { in: memberIds }, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: feedPostSelect,
  });
  const items = posts.map(toFeedItem);

  return (
    <main className="mx-auto w-full max-w-[900px] px-6 py-10">
      <div className="flex items-center gap-4">
        {team.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-line object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1a1815] font-mono text-[28px] text-acc">
            {team.name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">{team.name}</h1>
          {team.description && <p className="mt-1 text-[14px] text-muted">{team.description}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-8 md:flex-row md:gap-10">
        <aside className="w-full shrink-0 md:w-[220px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold text-sub">멤버 {team.members.length}</h2>
          </div>
          <ul className="mt-3 space-y-2.5">
            {team.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2.5">
                <Avatar name={m.user.name ?? m.user.handle ?? "?"} image={imgProxy(m.user.image, "avatar", m.user.id)} size="sm" />
                <a href={m.user.handle ? `/@${m.user.handle}` : "#"} className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-sub hover:text-acc">
                  {m.user.name ?? m.user.handle}
                </a>
                {m.role === "owner" && <span className="shrink-0 rounded-full bg-acc-soft px-2 py-0.5 font-mono text-[10px] font-bold text-acc">팀장</span>}
              </li>
            ))}
          </ul>
          {isOwner && <InviteMember teamId={team.id} />}
        </aside>

        <section className="min-w-0 flex-1">
          <h2 className="mb-1 text-[15px] font-extrabold">팀 글</h2>
          <FeedList items={items} empty="아직 팀 멤버가 쓴 글이 없어요" />
        </section>
      </div>
    </main>
  );
}
