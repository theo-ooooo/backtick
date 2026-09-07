import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination.dto.js';

export class CommentDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  authorId!: string;
  @ApiProperty({ description: '이름, 핸들, 익명 순서로 표시' })
  authorName!: string;
  @ApiProperty({ type: String, nullable: true })
  authorHandle!: string | null;
  @ApiProperty({ type: String, nullable: true })
  authorImage!: string | null;
  @ApiProperty({ type: String, nullable: true })
  replyToName!: string | null;
  @ApiProperty({ description: '삭제된 댓글은 빈 문자열' })
  content!: string;
  @ApiProperty()
  deleted!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class CommentThreadDto extends CommentDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '같은 게시글의 답글 수 (삭제 표시 포함)',
  })
  replyCount!: number;
}

export class CommentThreadsPageDto {
  @ApiProperty({ type: [CommentThreadDto] })
  items!: CommentThreadDto[];
  @ApiProperty({
    type: PaginationMetaDto,
    description: '표시되는 최상위 댓글 기준 페이지',
  })
  pagination!: PaginationMetaDto;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '게시글 전체의 삭제되지 않은 댓글·유효 답글 수',
  })
  commentCount!: number;
}

export class CommentRepliesPageDto {
  @ApiProperty({ type: [CommentDto] })
  items!: CommentDto[];
  @ApiProperty({
    type: PaginationMetaDto,
    description: '삭제 표시를 포함한 해당 스레드 답글 기준 페이지',
  })
  pagination!: PaginationMetaDto;
}
