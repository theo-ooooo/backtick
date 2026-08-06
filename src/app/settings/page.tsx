import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { saveProfile } from "@/lib/actions/user";
import { AvatarUploader } from "@/components/settings/AvatarUploader";
import { Field, Input, Textarea, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "설정" };


export default async function SettingsPage(props: PageProps<"/settings">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { saved, error } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-10">
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em]">프로필</h1>
      <p className="mt-1.5 text-[13.5px] font-medium text-muted">
        핸들을 설정하면 <span className="font-mono">/@핸들</span> 블로그가 열려요.
      </p>

      <div className="mt-5 space-y-2">
        {saved && <Alert tone="success">저장했어요</Alert>}
        {error && (
          <Alert tone="error">
            {error === "taken" ? "이미 사용 중인 핸들이에요" : error === "email" ? "이메일 형식을 확인해주세요" : "핸들은 영문 소문자·숫자·하이픈 3~20자예요"}
          </Alert>
        )}
      </div>

      <div className="mt-7 border-b border-line pb-7">
        <AvatarUploader name={user.name ?? user.email ?? "?"} image={user.image} />
      </div>

      <form action={saveProfile} className="mt-7 space-y-6">
        <Field label="이름">
          <Input name="name" defaultValue={user.name ?? ""} maxLength={40} />
        </Field>
        <div>
          <Label>핸들</Label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line focus-within:border-acc">
            <span className="flex items-center bg-paper px-3.5 font-mono text-[13px] text-muted">backtick.blog/@</span>
            <input
              name="handle"
              defaultValue={user.handle ?? ""}
              required
              pattern="[a-z0-9-]{3,20}"
              placeholder="handle"
              className="w-full bg-white px-3 py-3 font-mono text-[14.5px] font-medium outline-none"
            />
          </div>
        </div>
        <Field label="소개">
          <Textarea name="bio" defaultValue={user.bio ?? ""} rows={3} maxLength={180} />
        </Field>
        <Field label="GitHub">
          <Input name="githubUrl" defaultValue={user.githubUrl ?? ""} placeholder="github.com/username" className="font-mono text-[13.5px]" />
        </Field>
        <Field label="웹사이트">
          <Input name="websiteUrl" defaultValue={user.websiteUrl ?? ""} placeholder="https://my-site.com" className="font-mono text-[13.5px]" />
        </Field>
        <Field label="공개 이메일">
          <Input name="publicEmail" type="email" defaultValue={user.publicEmail ?? ""} placeholder="contact@example.com (블로그에 표시돼요)" className="font-mono text-[13.5px]" />
        </Field>
        <div className="flex gap-2.5 pt-1">
          <Button className="rounded-xl px-6 py-3 text-[14px]">저장</Button>
        </div>
      </form>
    </main>
  );
}
