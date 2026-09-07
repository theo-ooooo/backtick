import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { PostDetailDto, PostsPageDto } from './dto/post-response.dto.js';
import { PostsService } from './posts.service.js';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @ApiOperation({ summary: '발행된 게시글 목록 조회' })
  @ApiOkResponse({ type: PostsPageDto })
  @ApiBadRequestResponse({
    description: '잘못된 페이지/필터 또는 허용되지 않은 쿼리',
  })
  list(@Query() query: ListPostsDto) {
    return this.posts.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '발행된 게시글 상세 조회' })
  @ApiOkResponse({ type: PostDetailDto })
  @ApiNotFoundResponse({ description: '공개 게시글이 존재하지 않음' })
  getById(@Param('id') id: string) {
    return this.posts.getById(id);
  }
}
