/** Deterministic palette pick from a string (stable across renders/servers). */
function hashPick<T>(name: string, palette: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/** small square dot next to external source names */
const DOT_COLORS = ["#e0533d", "#2f6fed", "#0ca678", "#b08800", "#6741d9", "#d6336c", "#0b7285", "#e8590c"] as const;
export const dotColor = (name: string) => hashPick(name, DOT_COLORS);

/** solid logo tiles on the sources page */
const LOGO_COLORS = ["#2f6fed", "#fbbf24", "#3bb2f6", "#0ca678", "#e8590c", "#6741d9", "#d6336c", "#0b7285", "#e0533d"] as const;
export const logoColor = (name: string) => hashPick(name, LOGO_COLORS);
