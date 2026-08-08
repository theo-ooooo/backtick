"use client";

import { useActionState, useState } from "react";
import { passwordLogin, signup, type AuthFormState } from "@/lib/actions/auth";

const INITIAL: AuthFormState = { error: "" };

const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc";

/** 이메일 로그인 ↔ 회원가입 전환 폼. */
export function EmailAuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(passwordLogin, INITIAL);
  const [signupState, signupAction, signupPending] = useActionState(signup, INITIAL);

  const error = mode === "login" ? loginState.error : signupState.error;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div>
      <form action={mode === "login" ? loginAction : signupAction} className="space-y-2.5">
        {mode === "signup" && (
          <input name="name" required maxLength={40} placeholder="닉네임" className={inputCls} />
        )}
        <input name="email" type="email" required placeholder="이메일" className={inputCls} />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"}
          className={inputCls}
        />
        {error && <p className="px-1 text-[12.5px] font-semibold text-acc">{error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-bold text-ink transition hover:border-ink disabled:opacity-60"
        >
          {pending ? "처리 중…" : mode === "login" ? "이메일로 로그인" : "회원가입"}
        </button>
      </form>

      <p className="mt-3 text-center text-[13px] text-muted">
        {mode === "login" ? (
          <>
            처음이신가요?{" "}
            <button type="button" onClick={() => setMode("signup")} className="font-bold text-acc hover:underline">
              회원가입
            </button>
          </>
        ) : (
          <>
            이미 계정이 있나요?{" "}
            <button type="button" onClick={() => setMode("login")} className="font-bold text-acc hover:underline">
              로그인
            </button>
          </>
        )}
      </p>
    </div>
  );
}
