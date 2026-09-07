import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [PostsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
