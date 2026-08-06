import Link from "next/link";

/** Small monospace tag chip — used on feed rows, post pages and the tags page. */
export function TagChip({ name, asLink = false }: { name: string; asLink?: boolean }) {
  const cls =
    "inline-block shrink-0 max-w-[160px] truncate whitespace-nowrap rounded-md border border-line bg-paper/70 px-2 py-[3px] font-mono text-[11.5px] font-medium text-sub transition hover:border-acc hover:text-acc";
  if (asLink) {
    return (
      <Link href={`/tags/${encodeURIComponent(name)}`} className={cls}>
        {name}
      </Link>
    );
  }
  return <span className={cls}>{name}</span>;
}
