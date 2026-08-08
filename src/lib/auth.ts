import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // jwt so the Credentials provider works alongside the adapter
  pages: { signIn: "/login" },
  providers: [
    ...(githubEnabled ? [GitHub] : []),
    Credentials({
      id: "password",
      name: "이메일 로그인",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        // 계정이 없거나 비밀번호 미설정(GitHub 전용 계정) — 동일한 실패로 응답해 계정 존재를 노출하지 않는다
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      // 아바타가 data URL(수십 KB)일 수 있어 JWT에 넣으면 쿠키 헤더가 한도를 초과한다(494).
      // 프로필 정보는 항상 DB(currentUser)에서 읽으므로 토큰은 uid만 최소로 유지.
      delete token.picture;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export const isGithubEnabled = githubEnabled;

/** Current user's DB row (or null) — includes handle for gating the editor. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
