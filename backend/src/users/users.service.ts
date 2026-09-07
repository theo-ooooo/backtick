import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PostsService } from '../posts/posts.service.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { UserPostsQueryDto } from './dto/user-query.dto.js';

const profileSelect = {
  id: true,
  handle: true,
  name: true,
  image: true,
  bio: true,
  readme: true,
  githubUrl: true,
  websiteUrl: true,
  publicEmail: true,
  createdAt: true,
  _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
  ) {}

  async profile(handle: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { handle },
      select: profileSelect,
    });
    if (!user?.handle) throw new NotFoundException('User not found');
    // Keep both the database projection and the serialized profile explicit.
    return {
      id: user.id,
      handle: user.handle,
      name: user.name,
      image: user.image,
      bio: user.bio,
      readme: user.readme,
      githubUrl: user.githubUrl,
      websiteUrl: user.websiteUrl,
      publicEmail: user.publicEmail,
      createdAt: user.createdAt,
      publishedPostCount: user._count.posts,
    };
  }

  async listPosts(handle: string, query: UserPostsQueryDto) {
    await this.requireUser(handle);
    return this.posts.list({
      page: query.page,
      limit: query.limit,
      author: handle,
    });
  }

  async popularPosts(handle: string, limit: number) {
    await this.requireUser(handle);
    return this.posts.listPopularByAuthor(handle, limit);
  }

  private async requireUser(handle: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { handle },
      select: { id: true, handle: true },
    });
    if (!user?.handle) throw new NotFoundException('User not found');
  }
}
