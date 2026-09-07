import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginationDto } from '../common/pagination.dto.js';
import {
  CommentDto,
  CommentRepliesPageDto,
  CommentThreadsPageDto,
} from './dto/comment-response.dto.js';

const publicPostWhere = {
  status: 'PUBLISHED',
  author: { handle: { not: null } },
} satisfies Prisma.PostWhereInput;

const commentSelect = {
  id: true,
  authorId: true,
  replyToName: true,
  content: true,
  createdAt: true,
  deletedAt: true,
  author: { select: { name: true, handle: true, image: true } },
} satisfies Prisma.CommentSelect;

type CommentRow = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

function toComment(row: CommentRow): CommentDto {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.author.name ?? row.author.handle ?? '익명',
    authorHandle: row.author.handle,
    authorImage: row.author.image,
    replyToName: row.replyToName,
    content: row.deletedAt ? '' : row.content,
    deleted: Boolean(row.deletedAt),
    createdAt: row.createdAt,
  };
}

function publicComments(postId: string): Prisma.CommentWhereInput {
  // Apply the public-post condition to reads/counts as well as the existence check.
  return { postId, post: publicPostWhere };
}

function visibleThreads(postId: string): Prisma.CommentWhereInput {
  return {
    ...publicComments(postId),
    parentId: null,
    OR: [{ deletedAt: null }, { replies: { some: { postId } } }],
  };
}

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async threads(
    postId: string,
    { page, limit }: PaginationDto,
  ): Promise<CommentThreadsPageDto> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, ...publicPostWhere },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const where = visibleThreads(postId);
    const [rows, total, commentCount] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        select: {
          ...commentSelect,
          _count: { select: { replies: { where: { postId } } } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
      this.prisma.comment.count({
        where: {
          ...publicComments(postId),
          deletedAt: null,
          // Ignore orphaned, cross-post and deeper-than-two-level replies.
          OR: [{ parentId: null }, { parent: { postId, parentId: null } }],
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        ...toComment(row),
        replyCount: row._count.replies,
      })),
      pagination: pagination(page, limit, total),
      commentCount,
    };
  }

  async replies(
    postId: string,
    threadId: string,
    { page, limit }: PaginationDto,
  ): Promise<CommentRepliesPageDto> {
    const thread = await this.prisma.comment.findFirst({
      where: { ...visibleThreads(postId), id: threadId },
      select: { id: true },
    });
    if (!thread) throw new NotFoundException('Comment thread not found');

    const where: Prisma.CommentWhereInput = {
      ...publicComments(postId),
      parentId: threadId,
      parent: { postId, parentId: null },
    };
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        select: commentSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return {
      items: rows.map(toComment),
      pagination: pagination(page, limit, total),
    };
  }
}
