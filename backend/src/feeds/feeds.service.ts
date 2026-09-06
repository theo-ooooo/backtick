import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { escapeLikePattern } from '../common/search.js';
import { ListFeedPostsDto } from './dto/list-feed-posts.dto.js';
import { FeedDto, FeedPostsPageDto } from './dto/feed-response.dto.js';

const sourceSelect = {
  id: true,
  name: true,
  siteUrl: true,
} satisfies Prisma.FeedSelect;

@Injectable()
export class FeedsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSources(): Promise<FeedDto[]> {
    const feeds = await this.prisma.feed.findMany({
      where: { enabled: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        ...sourceSelect,
        description: true,
        _count: { select: { posts: true } },
      },
    });
    return feeds.map(({ _count, ...feed }) => ({
      ...feed,
      postCount: _count.posts,
    }));
  }

  async listPosts(query: ListFeedPostsDto): Promise<FeedPostsPageDto> {
    const { page, limit, feedId, tag, q } = query;
    const search = q ? escapeLikePattern(q) : undefined;
    const where: Prisma.ExternalPostWhereInput = {
      feed: { enabled: true },
      ...(feedId ? { feedId } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [posts, total] = await Promise.all([
      this.prisma.externalPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          url: true,
          excerpt: true,
          author: true,
          thumbnail: true,
          likes: true,
          tags: true,
          publishedAt: true,
          feed: { select: sourceSelect },
        },
      }),
      this.prisma.externalPost.count({ where }),
    ]);
    return {
      items: posts.map(({ feed, ...post }) => ({ ...post, source: feed })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
