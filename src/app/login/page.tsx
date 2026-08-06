import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, isGithubEnabled, isDevLoginEnabled } from "@/lib/auth";
import { githubLogin, devLogin } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  // JWT가 있어도 DB에 유저가 없으면(삭제·병합된 계정) 로그인 폼을 보여준다
  const me = await currentUser();
  if (me) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-6 py-16">
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-mono text-[30px] font-semibold text-acc">`</span>
          <span className="text-[27px] font-extrabold tracking-[-0.035em]">백틱</span>
        </div>
        <p className="mt-4 text-[14.5px] font-medium leading-relaxed text-muted">
          코드를 감싸는 기호처럼,
          <br />
          당신의 기록을 감싸는 곳.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {isGithubEnabled ? (
          <form action={githubLogin}>
            <button className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-ink px-4 py-3.5 text-[15px] font-bold text-white transition hover:opacity-85">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub으로 계속하기
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-4 py-3.5 text-center text-[13px] font-medium text-faint">
            GitHub 로그인은 준비 중이에요
          </div>
        )}

        {isDevLoginEnabled && (
          <>
            <div className="flex items-center gap-3 py-1 text-[11.5px] font-semibold text-faint">
              <span className="h-px flex-1 bg-line" /> 또는 <span className="h-px flex-1 bg-line" />
            </div>
            <form action={devLogin} className="space-y-2.5">
              <input
                name="name"
                placeholder="이름"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="이메일"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc"
              />
              <button className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-bold text-ink transition hover:border-ink">
                이메일로 계속하기
              </button>
            </form>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <span className="rounded-lg bg-paper px-3 py-1.5 font-mono text-[11.5px] text-muted">
          ` backtick.blog/@your-handle
        </span>
      </div>
    </main>
  );
}
