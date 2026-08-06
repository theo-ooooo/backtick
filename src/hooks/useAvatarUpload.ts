"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatar } from "@/lib/actions/user";

const SIZE = 256;

/** 파일 → 256px 정방형(cover)으로 캔버스 리사이즈 → webp data URL */
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}

/** 프로필 이미지 업로드 상태·로직 — 선택 즉시 리사이즈해 서버 액션으로 저장. */
export function useAvatarUpload(initialImage: string | null) {
  const [preview, setPreview] = useState(initialImage);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const upload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 올릴 수 있어요");
        return;
      }
      setError("");
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      startTransition(async () => {
        const res = await updateAvatar(dataUrl);
        if (!res.ok) {
          setError(res.error ?? "업로드에 실패했어요");
          setPreview(initialImage);
        } else {
          router.refresh();
        }
      });
    },
    [initialImage, router],
  );

  const reset = useCallback(() => {
    setError("");
    setPreview(null);
    startTransition(async () => {
      const res = await updateAvatar(null);
      if (res.ok) router.refresh();
    });
  }, [router]);

  return { preview, error, pending, upload, reset };
}
