import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  handle!: string;
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;
  @ApiProperty({ type: String, nullable: true })
  image!: string | null;
  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: '공개 프로필 마크다운',
  })
  readme!: string | null;
  @ApiProperty({ type: String, nullable: true })
  githubUrl!: string | null;
  @ApiProperty({ type: String, nullable: true })
  websiteUrl!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: '사용자가 직접 공개한 연락 이메일',
  })
  publicEmail!: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: '발행된 글만 포함한 글 수',
  })
  publishedPostCount!: number;
}
