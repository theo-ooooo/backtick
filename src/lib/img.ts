/** DB의 base64 이미지는 캐시되는 프록시 URL로 바꿔 서빙한다 (Supabase 이그레스·HTML 비대 방지). */
export function imgProxy(raw: string | null | undefined, kind: "cover" | "avatar", id: string, v?: Date): string | null {
  if (!raw) return null;
  if (!raw.startsWith("data:")) return raw;
  return `/api/img/${kind}/${id}${v ? `?v=${v.getTime()}` : ""}`;
}
