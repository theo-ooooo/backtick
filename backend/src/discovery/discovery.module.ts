import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service.js';
import { SearchController } from './search.controller.js';
import { TagsController } from './tags.controller.js';

@Module({
  controllers: [SearchController, TagsController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
