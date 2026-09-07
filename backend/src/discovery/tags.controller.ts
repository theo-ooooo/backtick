import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/api-response.decorator.js';
import { DiscoveryService } from './discovery.service.js';
import {
  TagListQueryDto,
  TagPostsQueryDto,
  TrendingTagsQueryDto,
} from './dto/discovery-query.dto.js';
import {
  DiscoveryResultsDto,
  TagCountDto,
} from './dto/discovery-response.dto.js';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  @ApiOperation({ summary: '공개 글의 태그별 게시글 수 (많은 순)' })
  @ApiSuccessResponse(TagCountDto, { isArray: true })
  @ApiErrorResponse(400, '잘못된 개수 또는 허용되지 않은 쿼리')
  tags(@Query() query: TagListQueryDto) {
    return this.discovery.tags(query.limit);
  }

  @Get('trending')
  @ApiOperation({ summary: '최근 30일 활성 외부 글에서 2회 이상 등장한 태그' })
  @ApiSuccessResponse(TagCountDto, { isArray: true })
  @ApiErrorResponse(400, '잘못된 개수 또는 허용되지 않은 쿼리')
  trending(@Query() query: TrendingTagsQueryDto) {
    return this.discovery.trendingTags(query.limit);
  }

  @Get('posts')
  @ApiOperation({
    summary: '태그가 정확히 일치하는 공개 자체/외부 글 (최신순)',
  })
  @ApiSuccessResponse(DiscoveryResultsDto)
  @ApiErrorResponse(400, '잘못된 태그/개수 또는 허용되지 않은 쿼리')
  posts(@Query() query: TagPostsQueryDto) {
    return this.discovery.tagPosts(query);
  }
}
