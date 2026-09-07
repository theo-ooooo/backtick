import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CommentPostParamsDto {
  @ApiProperty({
    description: '게시글 ID',
    pattern: '^[A-Za-z0-9_-]+$',
    maxLength: 100,
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(100)
  postId!: string;
}

export class CommentRepliesParamsDto extends CommentPostParamsDto {
  @ApiProperty({
    description: '최상위 댓글 ID',
    pattern: '^[A-Za-z0-9_-]+$',
    maxLength: 100,
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(100)
  threadId!: string;
}
