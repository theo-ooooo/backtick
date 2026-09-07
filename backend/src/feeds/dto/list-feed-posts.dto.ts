import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination.dto.js';

export class ListFeedPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: '수집 소스 ID', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  feedId?: string;

  @ApiPropertyOptional({
    description: '태그 이름 (정확히 일치)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tag?: string;

  @ApiPropertyOptional({ description: '제목/요약 검색어', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;
}
