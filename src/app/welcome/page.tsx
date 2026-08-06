import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

/** 로그인 직후 랜딩 — 핸들 있으면 내 블로그로, 없으면 설정으로. */
export default async function WelcomePage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  redirect(me.handle ? `/@${me.handle}` : "/settings");
}
