import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { createTeam } from "@/lib/actions/team";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "팀" };
export const revalidate = 60;

export default async function TeamsPage() {
  const me = await currentUser();
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, slug: true, description: true, image: true, _count: { select: { members: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-10">
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">팀</h1>
      <p className="mt-1 text-[13.5px] text-muted">함께 글을 모으는 공간이에요.</p>

      {me && (
        <form action={createTeam} className="mt-6 rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-3 text-[14px] font-extrabold">새 팀 만들기</h2>
          <div className="space-y-3">
            <Field label="팀 이름">
              <Input name="name" required maxLength={40} placeholder="예: 백엔드 스터디" />
            </Field>
            <Field label="소개">
              <Textarea name="description" rows={2} maxLength={200} placeholder="팀 소개 (선택)" />
            </Field>
            <Button className="rounded-xl px-5 py-2.5 text-[13.5px]">팀 만들기</Button>
          </div>
        </form>
      )}

      <div className="mt-8 divide-y divide-line/70">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.slug}`} className="group flex items-center gap-3 py-4">
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-line object-cover" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a1815] font-mono text-[18px] text-acc">
                {t.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-extrabold text-ink group-hover:text-acc">{t.name}</h3>
              {t.description && <p className="line-clamp-1 text-[13px] text-muted">{t.description}</p>}
            </div>
            <span className="shrink-0 font-mono text-[12px] text-faint">멤버 {t._count.members}</span>
          </Link>
        ))}
        {teams.length === 0 && <p className="py-16 text-center text-sm text-faint">아직 팀이 없어요</p>}
      </div>
    </main>
  );
}
