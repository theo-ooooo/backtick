import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { escapeLikePattern } from '../common/search.js';
import { SearchQueryDto, TagPostsQueryDto } from './dto/discovery-query.dto.js';
import {
  DiscoveryItemDto,
  DiscoveryResultsDto,
  QuickSearchResultsDto,
  TagCountDto,
} from './dto/discovery-response.dto.js';

const nativeSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  views: true,
  readMinutes: true,
  publishedAt: true,
  author: { select: { handle: true, name: true, image: true } },
  tags: { select: { tag: { select: { name: true } } } },
  _count: { select: { likes: true } },
} satisfies Prisma.PostSelect;

const externalSelect = {
  id: true,
  title: true,
  url: true,
  excerpt: true,
  author: true,
  thumbnail: true,
  likes: true,
  tags: true,
  publishedAt: true,
  feed: { select: { name: true } },
} satisfies Prisma.ExternalPostSelect;

type TagCountRow = { name: string; count: bigint };

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  search({ q, limit }: SearchQueryDto): Promise<DiscoveryResultsDto> {
    const search = escapeLikePattern(q);
    return this.listItems(
      limit,
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      },
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
        ],
      },
    );
  }

  async quickSearch(q: string): Promise<QuickSearchResultsDto> {
    if (q.length < 2) return { items: [] };
    const { items } = await this.search({ q, limit: 8 });
    return {
      items: items.map(({ title, url, kind, source, author }) => ({
        title,
        url,
        kind,
        source: source ?? author,
      })),
    };
  }

  tagPosts({ tag, limit }: TagPostsQueryDto): Promise<DiscoveryResultsDto> {
    return this.listItems(
      limit,
      { tags: { some: { tag: { name: tag } } } },
      { tags: { has: tag } },
    );
  }

  private async listItems(
    limit: number,
    nativeWhere: Prisma.PostWhereInput,
    externalWhere: Prisma.ExternalPostWhereInput,
  ): Promise<DiscoveryResultsDto> {
    // A source cannot contribute more than the final limit. Never load the full feed.
    const [native, external] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          ...nativeWhere,
          status: 'PUBLISHED',
          author: { handle: { not: null } },
        },
        select: nativeSelect,
        orderBy: [
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
        take: limit,
      }),
      this.prisma.externalPost.findMany({
        where: { ...externalWhere, feed: { enabled: true } },
        select: externalSelect,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
    ]);
    const items: DiscoveryItemDto[] = [
      ...native.map((post): DiscoveryItemDto => ({
        id: post.id,
        kind: 'native',
        title: post.title,
        url: `/@${encodeURIComponent(post.author.handle!)}/${encodeURIComponent(post.slug)}`,
        excerpt: post.excerpt,
        author: post.author.name ?? post.author.handle,
        authorHandle: post.author.handle,
        authorImage: post.author.image,
        source: null,
        thumbnail: post.coverImage,
        likes: post._count.likes,
        views: post.views,
        readMinutes: post.readMinutes,
        tags: post.tags.map(({ tag }) => tag.name),
        publishedAt: post.publishedAt,
      })),
      ...external.map(({ feed, ...post }): DiscoveryItemDto => ({
        ...post,
        kind: 'external',
        source: feed.name,
        authorHandle: null,
        authorImage: null,
        views: null,
        readMinutes: null,
      })),
    ];
    items.sort((a, b) => {
      const aTime = a.publishedAt?.getTime() ?? -Infinity;
      const bTime = b.publishedAt?.getTime() ?? -Infinity;
      if (aTime !== bTime) return aTime > bTime ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === 'native' ? -1 : 1;
      return a.id === b.id ? 0 : a.id > b.id ? -1 : 1;
    });
    return { items: items.slice(0, limit) };
  }

  async tags(limit: number): Promise<TagCountDto[]> {
    // UNION deduplicates repeated external tags per post; kind keeps ID namespaces separate.
    const rows = await this.prisma.$queryRaw<TagCountRow[]>(Prisma.sql`
      WITH tag_uses AS (
        SELECT p.id, 'native' AS kind, t.name
        FROM posts p
        JOIN users u ON u.id = p."authorId"
        JOIN post_tags pt ON pt."postId" = p.id
        JOIN tags t ON t.id = pt."tagId"
        WHERE p.status = 'PUBLISHED' AND u.handle IS NOT NULL
        UNION
        SELECT e.id, 'external' AS kind, tag.name
        FROM external_posts e
        JOIN feeds f ON f.id = e."feedId"
        CROSS JOIN LATERAL unnest(e.tags) AS tag(name)
        WHERE f.enabled = true
      )
      SELECT name, COUNT(*) AS count FROM tag_uses
      GROUP BY name ORDER BY count DESC, name COLLATE "C" ASC LIMIT ${limit}
    `);
    return rows.map(({ name, count }) => ({ name, count: Number(count) }));
  }

  async trendingTags(limit: number): Promise<TagCountDto[]> {
    const rows = await this.prisma.$queryRaw<TagCountRow[]>(Prisma.sql`
      WITH tag_uses AS (
        SELECT DISTINCT e.id, tag.name
        FROM external_posts e
        JOIN feeds f ON f.id = e."feedId"
        CROSS JOIN LATERAL unnest(e.tags) AS tag(name)
        WHERE f.enabled = true AND e."publishedAt" >= NOW() - INTERVAL '30 days'
      )
      SELECT name, COUNT(*) AS count FROM tag_uses
      GROUP BY name HAVING COUNT(*) >= 2
      ORDER BY count DESC, name COLLATE "C" ASC LIMIT ${limit}
    `);
    return rows.map(({ name, count }) => ({ name, count: Number(count) }));
  }
}
