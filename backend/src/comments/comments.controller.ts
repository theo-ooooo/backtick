import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/api-response.decorator.js';
import { PaginationDto } from '../common/pagination.dto.js';
import {
  CommentPostParamsDto,
  CommentRepliesParamsDto,
} from './dto/comment-params.dto.js';
import {
  CommentRepliesPageDto,
  CommentThreadsPageDto,
} from './dto/comment-response.dto.js';
import { CommentsService } from './comments.service.js';

@ApiTags('Comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @ApiOperation({ summary: '공개 게시글의 최상위 댓글과 전체 댓글 수 조회' })
  @ApiSuccessResponse(CommentThreadsPageDto)
  @ApiErrorResponse(400, '잘못된 게시글 ID/페이지/개수 또는 허용되지 않은 쿼리')
  @ApiErrorResponse(404, '공개 게시글이 존재하지 않음')
  threads(
    @Param() params: CommentPostParamsDto,
    @Query() query: PaginationDto,
  ) {
    return this.comments.threads(params.postId, query);
  }

  @Get(':threadId/replies')
  @ApiOperation({ summary: '공개 게시글의 최상위 댓글에 속한 답글 조회' })
  @ApiSuccessResponse(CommentRepliesPageDto)
  @ApiErrorResponse(
    400,
    '잘못된 게시글/스레드 ID/페이지/개수 또는 허용되지 않은 쿼리',
  )
  @ApiErrorResponse(404, '공개 게시글에 표시되는 스레드가 존재하지 않음')
  replies(
    @Param() params: CommentRepliesParamsDto,
    @Query() query: PaginationDto,
  ) {
    return this.comments.replies(params.postId, params.threadId, query);
  }
}
