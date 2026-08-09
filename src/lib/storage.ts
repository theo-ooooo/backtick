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
