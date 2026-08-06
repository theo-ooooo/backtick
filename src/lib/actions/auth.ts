"use server";

import { signIn } from "@/lib/auth";

export async function githubLogin() {
  await signIn("github", { redirectTo: "/settings" });
}

export async function devLogin(formData: FormData) {
  await signIn("dev", {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    redirectTo: "/settings",
  });
}
