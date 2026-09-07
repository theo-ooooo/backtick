import { ApiProperty } from '@nestjs/swagger';

export class LivenessDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
  @ApiProperty({ example: 'backtick-backend' })
  service!: string;
}

export class ReadinessDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
  @ApiProperty({ enum: ['up'] })
  database!: 'up';
}
