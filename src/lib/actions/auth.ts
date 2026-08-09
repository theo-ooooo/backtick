"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function githubLogin() {
  await signIn("github", { redirectTo: "/welcome" });
}

export async function googleLogin() {
  await signIn("google", { redirectTo: "/welcome" });
}

export interface AuthFormState {
  error: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** 이메일+비밀번호 로그인 */
export async function passwordLogin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  try {
    await signIn("password", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/welcome",
    });
    return { error: "" };
  } catch (e) {
    if (e instanceof AuthError) return { error: "이메일 또는 비밀번호가 맞지 않아요" };
    throw e; // NEXT_REDIRECT는 그대로 전파
  }
}

/** 이메일 회원가입 — 성공 시 바로 로그인 */
export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "닉네임을 입력해주세요" };
  if (!EMAIL_RE.test(email)) return { error: "이메일 형식을 확인해주세요" };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // GitHub로 가입된 이메일에 무검증으로 비밀번호를 붙이면 계정 탈취 통로가 된다 — 거부
    return { error: "이미 가입된 이메일이에요. GitHub 로그인 또는 기존 방법을 이용해주세요" };
  }

  const dupName = await prisma.user.findFirst({ where: { name } });
  if (dupName) return { error: "이미 사용 중인 닉네임이에요" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name, passwordHash } });

  await signIn("password", { email, password, redirectTo: "/welcome" });
  return { error: "" };
}
