"use server";

import { signIn, signOut } from "@/lib/auth";

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function githubLogin() {
  await signIn("github", { redirectTo: "/welcome" });
}

export async function devLogin(formData: FormData) {
  await signIn("dev", {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    redirectTo: "/welcome",
  });
}
