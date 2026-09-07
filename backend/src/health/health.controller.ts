import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/api-response.decorator.js';
import { LivenessDto, ReadinessDto } from './health-response.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiSuccessResponse(LivenessDto)
  live() {
    return { status: 'ok', service: 'backtick-backend' };
  }

  @Get('ready')
  @ApiSuccessResponse(ReadinessDto)
  @ApiErrorResponse(503, 'PostgreSQL is unavailable.')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (cause) {
      throw new ServiceUnavailableException('Database is unavailable', {
        cause,
      });
    }
  }
}
