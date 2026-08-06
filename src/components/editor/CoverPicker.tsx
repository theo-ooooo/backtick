"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";

const MAX_W = 800;

/** 파일 → 최대 800px 폭 webp data URL (커버용) */
async function fileToCover(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.8);
}

/** 에디터 썸네일 선택 — 미설정 시 본문 첫 이미지 → 자동 브랜드 카드 순으로 폴백. */
export function CoverPicker({ defaultCover }: { defaultCover?: string | null }) {
  const [cover, setCover] = useState(defaultCover ?? "");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="coverImage" value={cover} />
      {cover ? (
        <img src={cover} alt="썸네일" className="h-[44px] w-[70px] rounded-lg border border-line object-cover" />
      ) : (
        <span className="flex h-[44px] w-[70px] items-center justify-center rounded-lg bg-[#1a1815] font-mono text-[16px] text-acc">
          `
        </span>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-full border border-line px-3 py-1.5 font-mono text-[12px] font-semibold text-sub transition hover:border-acc hover:text-acc"
      >
        썸네일 {cover ? "변경" : "설정"}
      </button>
      {cover && (
        <button
          type="button"
          onClick={() => setCover("")}
          className="font-mono text-[12px] font-semibold text-faint transition hover:text-acc"
        >
          제거
        </button>
      )}
      <span className="text-[11.5px] text-faint">{error || "미설정 시 본문 첫 이미지 → 자동 카드"}</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!f.type.startsWith("image/")) return setError("이미지 파일만 가능해요");
          const dataUrl = await fileToCover(f);
          if (dataUrl.length > 400_000) return setError("이미지가 너무 커요");
          setError("");
          setCover(dataUrl);
        }}
      />
    </div>
  );
}
