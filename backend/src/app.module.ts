import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostsModule } from './posts/posts.module.js';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FeedsModule } from './feeds/feeds.module.js';
import { DiscoveryModule } from './discovery/discovery.module.js';

@Module({
  imports: [
    PostsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    FeedsModule,
    DiscoveryModule,
  ],
})
export class AppModule {}
