import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { escapeLikePattern } from '../common/search.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import {
  PostDetailDto,
  PostSummaryDto,
  PostsPageDto,
} from './dto/post-response.dto.js';

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  readMinutes: true,
  views: true,
  publishedAt: true,
  updatedAt: true,
  author: { select: { id: true, handle: true, name: true, image: true } },
  tags: { select: { tag: { select: { name: true } } } },
  _count: { select: { likes: true } },
} satisfies Prisma.PostSelect;

type SummaryRow = Prisma.PostGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow) {
  const { tags, _count, ...post } = row;
  return {
    ...post,
    tags: tags.map(({ tag }) => tag.name),
    likes: _count.likes,
  };
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPostsDto): Promise<PostsPageDto> {
    const { page, limit, author, tag, q } = query;
    const search = q ? escapeLikePattern(q) : undefined;
    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      author: { handle: author ?? { not: null } },
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: summarySelect,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return {
      items: rows.map(toSummary),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listPopularByAuthor(
    author: string,
    limit: number,
  ): Promise<PostSummaryDto[]> {
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', author: { handle: author } },
      select: summarySelect,
      orderBy: [
        { views: 'desc' },
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit,
    });
    return posts.map(toSummary);
  }

  async getById(id: string): Promise<PostDetailDto> {
    const post = await this.prisma.post.findFirst({
      where: { id, status: 'PUBLISHED', author: { handle: { not: null } } },
      select: { ...summarySelect, content: true, summary: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return { ...toSummary(post), content: post.content, summary: post.summary };
  }
}
