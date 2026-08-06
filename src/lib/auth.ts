import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
// dev-only quick login so the editor is testable before GitHub OAuth keys exist
const devLoginEnabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "1";

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // jwt so the Credentials provider works alongside the adapter
  pages: { signIn: "/login" },
  providers: [
    ...(githubEnabled ? [GitHub] : []),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "개발용 로그인",
            credentials: { email: { label: "이메일" }, name: { label: "이름" } },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              const name = String(credentials?.name ?? "").trim() || email.split("@")[0];
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
              const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { email, name },
              });
              return { id: user.id, email: user.email, name: user.name, image: user.image };
            },
          }),
        ]
      : []),
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
export const isDevLoginEnabled = devLoginEnabled;

/** Current user's DB row (or null) — includes handle for gating the editor. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
