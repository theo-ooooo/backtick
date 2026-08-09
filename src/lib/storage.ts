/** Supabase Storage 업로드 — 엣지 함수(img-upload) 경유. 성공 시 공개 URL, 실패 시 null. */
export async function uploadImage(dataUrl: string, path: string): Promise<string | null> {
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch("https://eoassqhvtplpobndyhie.supabase.co/functions/v1/img-upload", {
      method: "POST",
      headers: { "content-type": "application/json", "x-upload-secret": secret },
      body: JSON.stringify({ dataUrl, path }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  } catch {
    return null;
  }
}

const STORAGE_BASE = "https://eoassqhvtplpobndyhie.supabase.co/storage/v1/object/public/images/";
const FN_URL = "https://eoassqhvtplpobndyhie.supabase.co/functions/v1/img-upload";

/** 초안 생성 전 users/{id}/inline 에 올라간 본문 이미지를 posts/{postId}/inline 으로 옮기고 본문 URL을 재작성한다. */
export async function adoptInlineImages(content: string, userId: string, postId: string): Promise<string> {
  const secret = process.env.UPLOAD_SECRET;
  if (!secret) return content;
  const prefix = `${STORAGE_BASE}users/${userId}/inline/`;
  const re = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([a-z0-9_.-]+)`, "g");
  let out = content;
  for (const m of [...content.matchAll(re)]) {
    const file = m[1];
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-upload-secret": secret },
        body: JSON.stringify({ op: "move", from: `users/${userId}/inline/${file}`, to: `posts/${postId}/inline/${file}` }),
        signal: AbortSignal.timeout(15000),
      });
      const { url } = (await res.json()) as { url?: string };
      if (res.ok && url) out = out.replaceAll(m[0], url);
    } catch {
      /* 옮기기 실패 시 원본 URL 유지 — 이미지는 여전히 유효 */
    }
  }
  return out;
}
