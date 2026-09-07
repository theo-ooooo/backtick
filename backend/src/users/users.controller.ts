import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/api-response.decorator.js';
import {
  PostSummaryDto,
  PostsPageDto,
} from '../posts/dto/post-response.dto.js';
import {
  PopularUserPostsQueryDto,
  UserHandleParamsDto,
  UserPostsQueryDto,
} from './dto/user-query.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':handle')
  @ApiOperation({ summary: '공개 프로필과 발행 글 수 조회' })
  @ApiSuccessResponse(UserProfileDto)
  @ApiErrorResponse(400, '잘못된 핸들')
  @ApiErrorResponse(404, '공개 프로필이 존재하지 않음')
  profile(@Param() params: UserHandleParamsDto) {
    return this.users.profile(params.handle);
  }

  @Get(':handle/posts')
  @ApiOperation({ summary: '작성자 블로그의 발행 글 목록 (기본 12개)' })
  @ApiSuccessResponse(PostsPageDto)
  @ApiErrorResponse(400, '잘못된 핸들/페이지/개수 또는 허용되지 않은 쿼리')
  @ApiErrorResponse(404, '공개 프로필이 존재하지 않음')
  posts(
    @Param() params: UserHandleParamsDto,
    @Query() query: UserPostsQueryDto,
  ) {
    return this.users.listPosts(params.handle, query);
  }

  @Get(':handle/popular-posts')
  @ApiOperation({ summary: '작성자 블로그의 조회수 상위 발행 글 (기본 3개)' })
  @ApiSuccessResponse(PostSummaryDto, { isArray: true })
  @ApiErrorResponse(400, '잘못된 핸들/개수 또는 허용되지 않은 쿼리')
  @ApiErrorResponse(404, '공개 프로필이 존재하지 않음')
  popular(
    @Param() params: UserHandleParamsDto,
    @Query() query: PopularUserPostsQueryDto,
  ) {
    return this.users.popularPosts(params.handle, query.limit);
  }
}
