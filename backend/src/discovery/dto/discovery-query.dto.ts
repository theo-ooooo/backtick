import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagListQueryDto {
  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 100;
}

export class SearchQueryDto extends TagListQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  override limit = 30;

  @ApiProperty({
    description: '제목/본문(자체 글), 제목/요약(외부 글) 검색어',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;
}

export class QuickSearchQueryDto {
  @ApiPropertyOptional({
    default: '',
    description: '두 글자 미만이면 빈 결과',
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q = '';
}

export class TagPostsQueryDto extends TagListQueryDto {
  @ApiPropertyOptional({ default: 40, minimum: 1, maximum: 100 })
  override limit = 40;

  @ApiProperty({
    description: '태그 이름 (대소문자를 구분하여 정확히 일치)',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tag!: string;
}

export class TrendingTagsQueryDto extends TagListQueryDto {
  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 100 })
  override limit = 6;
}
