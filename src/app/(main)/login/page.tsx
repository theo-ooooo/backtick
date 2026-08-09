import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, isGithubEnabled, isGoogleEnabled } from "@/lib/auth";
import { githubLogin, googleLogin } from "@/lib/actions/auth";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";

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

        {isGoogleEnabled && (
          <form action={googleLogin}>
            <button className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] font-bold text-ink transition hover:border-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.03c2.2-2.05 3.5-5.05 3.5-8.6" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.06 7.9-2.9l-3.76-2.9c-1 .7-2.36 1.2-4.14 1.2-3.16 0-5.84-2.08-6.8-4.96l-.14.01-3.64 2.8-.05.14C3.35 21.3 7.36 24 12 24" />
                <path fill="#FBBC05" d="M5.2 14.44a7.4 7.4 0 0 1-.4-2.36c0-.82.15-1.62.4-2.36l-.01-.16-3.68-2.85-.12.06A11.96 11.96 0 0 0 .1 12.1c0 1.94.47 3.77 1.29 5.4l3.8-3.05" />
                <path fill="#EB4335" d="M12 4.76c2.24 0 3.75.97 4.62 1.78l3.37-3.3C17.9 1.24 15.2 0 12 0 7.36 0 3.35 2.67 1.4 6.56l3.8 2.96C6.16 6.84 8.84 4.76 12 4.76" />
              </svg>
              Google로 계속하기
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 py-1 text-[11.5px] font-semibold text-faint">
          <span className="h-px flex-1 bg-line" /> 또는 <span className="h-px flex-1 bg-line" />
        </div>
        <EmailAuthForm />
      </div>

      <div className="mt-8 text-center">
        <span className="rounded-lg bg-paper px-3 py-1.5 font-mono text-[11.5px] text-muted">
          ` backtick.blog/@your-handle
        </span>
      </div>
    </main>
  );
}
