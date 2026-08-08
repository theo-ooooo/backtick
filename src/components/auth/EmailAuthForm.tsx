"use client";

import { useActionState, useState } from "react";
import { passwordLogin, signup, type AuthFormState } from "@/lib/actions/auth";

const INITIAL: AuthFormState = { error: "" };

const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] font-medium outline-none placeholder:text-faint focus:border-acc";

const DOMAINS = ["gmail.com", "naver.com", "kakao.com", "daum.net", "outlook.com"];

/** 이메일 입력 — 아이디 + 도메인 선택(직접 입력 지원). 합쳐진 값은 hidden input으로 제출. */
function EmailInput() {
  const [local, setLocal] = useState("");
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [custom, setCustom] = useState(false);
  const email = local && domain ? `${local}@${domain}` : "";

  return (
    <div>
      <input type="hidden" name="email" value={email} />
      <div className="flex items-center gap-1.5">
        <input
          value={local}
          required
          placeholder="이메일 아이디"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setLocal(e.target.value.replace(/[@\s]/g, ""))}
          className={inputCls}
        />
        <span className="shrink-0 font-mono text-[14px] text-muted">@</span>
        {custom ? (
          <input
            value={domain}
            required
            placeholder="도메인 직접 입력"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setDomain(e.target.value.replace(/[@\s]/g, "").toLowerCase())}
            className={inputCls}
            autoFocus
          />
        ) : (
          <select
            value={domain}
            onChange={(e) => {
              if (e.target.value === "__custom") {
                setCustom(true);
                setDomain("");
              } else {
                setDomain(e.target.value);
              }
            }}
            className="w-full appearance-none rounded-xl border border-line bg-white px-3.5 py-3 text-[14px] font-medium outline-none focus:border-acc"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="__custom">직접 입력</option>
          </select>
        )}
      </div>
      {custom && (
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            setDomain(DOMAINS[0]);
          }}
          className="mt-1 px-1 text-[12px] font-semibold text-faint hover:text-acc"
        >
          ← 목록에서 선택
        </button>
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
