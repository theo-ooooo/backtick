"use client";

import { useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

/** 설정 페이지의 프로필 이미지 영역 (design screen 10). */
export function AvatarUploader({ name, image }: { name: string; image: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { preview, error, pending, upload, reset } = useAvatarUpload(image);

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} image={preview} size="xl" tone="neutral" />
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? "업로드 중…" : "이미지 변경"}
          </Button>
          {preview && (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={reset}>
              제거
            </Button>
          )}
        </div>
        <span className="text-[12px] font-medium text-faint">
          {error || "정방형으로 잘려요 · 최대 5MB"}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
