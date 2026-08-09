"use client";

import { useActionState, useState } from "react";
import { passwordLogin, signup, type AuthFormState } from "@/lib/actions/auth";

const INITIAL: AuthFormState = { error: "" };

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc";

const DOMAINS = ["gmail.com", "naver.com", "kakao.com", "daum.net", "outlook.com", "icloud.com"];

/** 이메일 입력 — 단일 필드 + @ 뒤 도메인 자동완성 칩 (요즘 방식). */
function EmailInput() {
  const [email, setEmail] = useState("");

  const at = email.indexOf("@");
  const typed = at >= 0 ? email.slice(at + 1) : null;
  // @를 쳤고 아직 도메인이 완성 전이면 이어질 후보를 보여준다
  const suggestions =
    typed !== null && !DOMAINS.includes(typed)
      ? DOMAINS.filter((d) => d.startsWith(typed)).slice(0, 4)
      : [];

  return (
    <div>
      <input
        name="email"
        type="email"
        value={email}
        required
        placeholder="이메일"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
        className={inputCls}
      />
      {suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setEmail(email.slice(0, at + 1) + d)}
              className="rounded-full border border-line bg-card px-3 py-1.5 font-mono text-[12.5px] font-semibold text-sub transition hover:border-acc hover:text-acc"
            >
              {email.slice(0, at + 1)}
              <span className="text-acc">{d}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <EmailInput />
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
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-[14.5px] font-bold text-ink transition hover:border-ink disabled:opacity-60"
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
