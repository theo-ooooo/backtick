import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination.dto.js';

export class PublicAuthorDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ nullable: true, type: String })
  handle!: string | null;
  @ApiProperty({ nullable: true, type: String })
  name!: string | null;
  @ApiProperty({ nullable: true, type: String })
  image!: string | null;
}

export class PostSummaryDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty({ nullable: true, type: String })
  excerpt!: string | null;
  @ApiProperty({ nullable: true, type: String })
  coverImage!: string | null;
  @ApiProperty()
  readMinutes!: number;
  @ApiProperty()
  views!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
  @ApiProperty({ type: PublicAuthorDto })
  author!: PublicAuthorDto;
  @ApiProperty({ type: [String] })
  tags!: string[];
  @ApiProperty()
  likes!: number;
}

export class PostDetailDto extends PostSummaryDto {
  @ApiProperty({ description: '마크다운 본문' })
  content!: string;
  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;
}

export class PostsPageDto {
  @ApiProperty({ type: [PostSummaryDto] })
  items!: PostSummaryDto[];
  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
