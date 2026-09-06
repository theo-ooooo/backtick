import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination.dto.js';

export class FeedSourceDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  siteUrl!: string;
}

export class FeedDto extends FeedSourceDto {
  @ApiProperty({ nullable: true, type: String })
  description!: string | null;
  @ApiProperty()
  postCount!: number;
}

export class FeedPostDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  url!: string;
  @ApiProperty({ nullable: true, type: String })
  excerpt!: string | null;
  @ApiProperty({ nullable: true, type: String })
  author!: string | null;
  @ApiProperty({ nullable: true, type: String })
  thumbnail!: string | null;
  @ApiProperty({ nullable: true, type: Number })
  likes!: number | null;
  @ApiProperty({ type: [String] })
  tags!: string[];
  @ApiProperty({ type: String, format: 'date-time' })
  publishedAt!: Date;
  @ApiProperty({ type: FeedSourceDto })
  source!: FeedSourceDto;
}

export class FeedPostsPageDto {
  @ApiProperty({ type: [FeedPostDto] })
  items!: FeedPostDto[];
  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
