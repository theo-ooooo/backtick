/** "3분 전 / 5시간 전 / 12일 전 / 8월 6일" — feed-style relative time. */
export function timeAgo(d: Date | null | undefined): string {
  if (!d) return "-";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

/** "https://toss.tech/" -> "toss.tech" */
export function toDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
