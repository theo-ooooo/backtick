import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FeedDto, FeedPostsPageDto } from './dto/feed-response.dto.js';
import { ListFeedPostsDto } from './dto/list-feed-posts.dto.js';
import { FeedsService } from './feeds.service.js';

@ApiTags('Feeds')
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feeds: FeedsService) {}

  @Get()
  @ApiOperation({ summary: '활성화된 기술 블로그 소스 조회' })
  @ApiOkResponse({ type: [FeedDto] })
  listSources() {
    return this.feeds.listSources();
  }

  @Get('posts')
  @ApiOperation({ summary: '활성 소스의 수집 게시글 조회' })
  @ApiOkResponse({ type: FeedPostsPageDto })
  @ApiBadRequestResponse({
    description: '잘못된 페이지/필터 또는 허용되지 않은 쿼리',
  })
  listPosts(@Query() query: ListFeedPostsDto) {
    return this.feeds.listPosts(query);
  }
}
