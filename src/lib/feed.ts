import { prisma } from "./prisma";

/** One unified card shape for the home feed (native posts + external posts). */
export interface FeedItem {
  kind: "native" | "external";
  title: string;
  url: string; // native: /@handle/slug, external: original article URL
  excerpt: string | null;
  author: string | null; // display name
  authorHandle: string | null; // native only
  authorImage: string | null; // native only
  source: string | null; // external only — e.g. "토스"
  publishedAt: Date;
}

export type FeedTab = "all" | "backtick" | "tech";

export async function getFeed(tab: FeedTab, take = 40): Promise<FeedItem[]> {
  const wantNative = tab === "all" || tab === "backtick";
  const wantExternal = tab === "all" || tab === "tech";

  const [posts, externals] = await Promise.all([
    wantNative
      ? prisma.post.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take,
          include: { author: true },
        })
      : Promise.resolve([]),
    wantExternal
      ? prisma.externalPost.findMany({
          orderBy: { publishedAt: "desc" },
          take: take * 4, // over-fetch so per-source capping still fills the page
          include: { feed: true },
        })
      : Promise.resolve([]),
  ]);

  const native: FeedItem[] = posts.map((p) => ({
    kind: "native",
    title: p.title,
    url: `/@${p.author.handle}/${p.slug}`,
    excerpt: p.excerpt,
    author: p.author.name ?? p.author.handle,
    authorHandle: p.author.handle,
    authorImage: p.author.image,
    source: null,
    publishedAt: p.publishedAt ?? p.createdAt,
  }));

  const external: FeedItem[] = externals.map((e) => ({
    kind: "external",
    title: e.title,
    url: e.url,
    excerpt: e.excerpt,
    author: e.author,
    authorHandle: null,
    authorImage: null,
    source: e.feed.name,
    publishedAt: e.publishedAt,
  }));

  // cap per external source so a chatty feed (e.g. GeekNews) can't flood the page
  const PER_SOURCE_CAP = 6;
  const seen = new Map<string, number>();
  const capped = external
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .filter((e) => {
      const n = (seen.get(e.source!) ?? 0) + 1;
      seen.set(e.source!, n);
      return n <= PER_SOURCE_CAP;
    });

  return [...native, ...capped]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, take);
}
