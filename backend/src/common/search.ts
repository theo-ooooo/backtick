/** Prisma PostgreSQL contains uses LIKE patterns; treat search input literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
