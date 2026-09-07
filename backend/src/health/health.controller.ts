import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'The API process is running.' })
  live() {
    return { status: 'ok', service: 'backtick-backend' };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'The API can query PostgreSQL.' })
  @ApiServiceUnavailableResponse({ description: 'PostgreSQL is unavailable.' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}
