import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/api-response.decorator.js';
import { DiscoveryService } from './discovery.service.js';
import {
  QuickSearchQueryDto,
  SearchQueryDto,
} from './dto/discovery-query.dto.js';
import {
  DiscoveryResultsDto,
  QuickSearchResultsDto,
} from './dto/discovery-response.dto.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  @ApiOperation({ summary: '공개 자체 글과 활성 외부 글 통합 검색 (최신순)' })
  @ApiSuccessResponse(DiscoveryResultsDto)
  @ApiErrorResponse(400, '잘못된 검색어/개수 또는 허용되지 않은 쿼리')
  search(@Query() query: SearchQueryDto) {
    return this.discovery.search(query);
  }

  @Get('quick')
  @ApiOperation({ summary: '빠른 검색 (최대 8개, 두 글자 미만은 빈 결과)' })
  @ApiSuccessResponse(QuickSearchResultsDto)
  @ApiErrorResponse(400, '잘못된 검색어 또는 허용되지 않은 쿼리')
  quickSearch(@Query() query: QuickSearchQueryDto) {
    return this.discovery.quickSearch(query.q);
  }
}
