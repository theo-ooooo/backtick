"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { updateTeamImage } from "@/lib/actions/team";

const MAX_W = 400;

async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}

/** 팀 로고 업로더 — owner 팀 헤더의 이미지에 오버레이. */
export function TeamLogoUploader({ teamId, image, name }: { teamId: string; image: string | null; name: string }) {
  const [url, setUrl] = useState(image);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-line"
      aria-label="팀 로고 변경"
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#1a1815] font-mono text-[28px] text-acc">{name.slice(0, 1)}</span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
        {busy ? "…" : "변경"}
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const res = await updateTeamImage(teamId, await fileToDataUrl(f));
          setBusy(false);
          if (res.ok && res.url) setUrl(res.url);
        }}
      />
    </button>
  );
}
