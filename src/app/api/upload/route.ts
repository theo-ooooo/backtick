import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

const DATA_RE = /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/;

/** 에디터 본문 이미지 업로드 — 로그인 필수, Storage에 저장 후 공개 URL 반환. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { dataUrl } = (await req.json().catch(() => ({}))) as { dataUrl?: string };
  if (!dataUrl || !DATA_RE.test(dataUrl)) return NextResponse.json({ error: "지원하지 않는 형식이에요" }, { status: 400 });
  if (dataUrl.length > 2_000_000) return NextResponse.json({ error: "이미지가 너무 커요 (최대 1.5MB)" }, { status: 413 });

  const url = await uploadImage(dataUrl, `users/${me.id}/inline/${Date.now().toString(36)}`);
  if (!url) return NextResponse.json({ error: "업로드에 실패했어요" }, { status: 502 });
  return NextResponse.json({ url });
}
