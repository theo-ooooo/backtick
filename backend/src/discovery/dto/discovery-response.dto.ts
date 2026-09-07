import { ApiProperty } from '@nestjs/swagger';

export class QuickSearchItemDto {
  @ApiProperty()
  title!: string;
  @ApiProperty()
  url!: string;
  @ApiProperty({ enum: ['native', 'external'] })
  kind!: 'native' | 'external';
  @ApiProperty({ type: String, nullable: true })
  source!: string | null;
}

export class DiscoveryItemDto extends QuickSearchItemDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ type: String, nullable: true })
  excerpt!: string | null;
  @ApiProperty({ type: String, nullable: true })
  author!: string | null;
  @ApiProperty({ type: String, nullable: true })
  authorHandle!: string | null;
  @ApiProperty({ type: String, nullable: true })
  authorImage!: string | null;
  @ApiProperty({ type: String, nullable: true })
  thumbnail!: string | null;
  @ApiProperty({ type: Number, nullable: true })
  likes!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  views!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  readMinutes!: number | null;
  @ApiProperty({ type: [String] })
  tags!: string[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;
}

export class DiscoveryResultsDto {
  @ApiProperty({ type: [DiscoveryItemDto] })
  items!: DiscoveryItemDto[];
}

export class QuickSearchResultsDto {
  @ApiProperty({ type: [QuickSearchItemDto] })
  items!: QuickSearchItemDto[];
}

export class TagCountDto {
  @ApiProperty()
  name!: string;
  @ApiProperty({ minimum: 1, type: 'integer' })
  count!: number;
}
