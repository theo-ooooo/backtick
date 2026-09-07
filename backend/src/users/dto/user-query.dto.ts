import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination.dto.js';

export class UserHandleParamsDto {
  @ApiProperty({
    description:
      '공개 핸들. @는 선택이며 앞뒤 공백 제거 후 소문자로 조회합니다.',
    pattern: '^@?[a-zA-Z0-9-]{3,20}$',
    example: 'theo',
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase().replace(/^@/, '')
      : value,
  )
  @IsString()
  @Matches(/^[a-z0-9-]{3,20}$/)
  handle!: string;
}

export class UserPostsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 100 })
  override limit = 12;
}

export class PopularUserPostsQueryDto {
  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 3;
}
