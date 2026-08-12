/** IndexNow — 빙·네이버·얀덱스에 새 URL 즉시 색인 요청. 구글은 미지원(서치콘솔 sitemap). */
export async function pingIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || paths.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: "backtick.blog",
        key,
        keyLocation: `https://backtick.blog/${key}.txt`,
        urlList: paths.map((p) => `https://backtick.blog${p}`),
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    /* 색인 핑 실패는 무시 */
  }
}
