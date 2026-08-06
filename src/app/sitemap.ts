import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublishedForIndex } from "@/lib/queries/post";

const BASE = "https://backtick.blog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags, authors] = await Promise.all([
    getPublishedForIndex(1000),
    prisma.tag.findMany({ select: { slug: true }, take: 200 }),
    prisma.user.findMany({
      where: { handle: { not: null }, posts: { some: { status: "PUBLISHED" } } },
      select: { handle: true },
    }),
  ]);

  return [
    { url: BASE, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/sources`, changeFrequency: "weekly", priority: 0.5 },
    ...authors.map((a) => ({
      url: `${BASE}/@${a.handle}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: `${BASE}/@${p.author.handle}/${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...tags.map((t) => ({
      url: `${BASE}/tags/${t.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.4,
    })),
  ];
}
