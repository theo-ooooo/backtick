import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "설정" };

const HANDLE_RE = /^[a-z0-9-]{3,20}$/;

export default async function SettingsPage(props: PageProps<"/settings">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { saved, error } = await props.searchParams;

  async function saveProfile(formData: FormData) {
    "use server";
    const me = await currentUser();
    if (!me) redirect("/login");
    const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").trim().slice(0, 40);
    const bio = String(formData.get("bio") ?? "").trim().slice(0, 180);
    const githubUrl = String(formData.get("githubUrl") ?? "").trim().slice(0, 120);

    if (!HANDLE_RE.test(handle)) redirect("/settings?error=handle");
    const taken = await prisma.user.findFirst({ where: { handle, NOT: { id: me.id } } });
    if (taken) redirect("/settings?error=taken");

    await prisma.user.update({
      where: { id: me.id },
      data: { handle, name: name || me.name, bio: bio || null, githubUrl: githubUrl || null },
    });
    revalidatePath("/");
    redirect("/settings?saved=1");
  }

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">프로필</h1>
      <p className="mt-1.5 text-[13.5px] font-medium text-muted">
        핸들을 설정하면 <span className="font-mono">/@핸들</span> 블로그가 열려요.
      </p>

      {saved && (
        <div className="mt-5 rounded-xl bg-[#e7f6ee] px-4 py-3 text-[13.5px] font-bold text-[#177245]">
          저장했어요
        </div>
      )}
      {error && (
        <div className="mt-5 rounded-xl bg-acc-soft px-4 py-3 text-[13.5px] font-bold text-acc">
          {error === "taken" ? "이미 사용 중인 핸들이에요" : "핸들은 영문 소문자·숫자·하이픈 3~20자예요"}
        </div>
      )}

      <form action={saveProfile} className="mt-7 space-y-6">
        <div>
          <label className="mb-2 block text-[13px] font-bold text-sub">이름</label>
          <input
            name="name"
            defaultValue={user.name ?? ""}
            maxLength={40}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium outline-none focus:border-acc"
          />
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-bold text-sub">핸들</label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line focus-within:border-acc">
            <span className="flex items-center bg-paper px-3.5 font-mono text-[13px] text-muted">backtick.blog/@</span>
            <input
              name="handle"
              defaultValue={user.handle ?? ""}
              required
              pattern="[a-z0-9-]{3,20}"
              placeholder="handle"
              className="w-full bg-white px-3 py-3 font-mono text-[14.5px] font-medium outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-bold text-sub">소개</label>
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            rows={3}
            maxLength={180}
            className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium leading-relaxed outline-none focus:border-acc"
          />
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-bold text-sub">GitHub</label>
          <input
            name="githubUrl"
            defaultValue={user.githubUrl ?? ""}
            placeholder="github.com/username"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 font-mono text-[13.5px] font-medium outline-none focus:border-acc"
          />
        </div>
        <div className="flex gap-2.5 pt-1">
          <button className="rounded-xl bg-ink px-6 py-3 text-[14px] font-bold text-white transition hover:opacity-85">
            저장
          </button>
        </div>
      </form>
    </main>
  );
}
