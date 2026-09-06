import 'reflect-metadata';
import { Test } from '@nestjs/testing';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/backtick_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.SWAGGER_ENABLED = 'true';

const { AppModule } = await import('../dist/app.module.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const { setupApp } = await import('../dist/setup-app.js');

export async function createTestApp(prisma) {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  const app = module.createNestApplication({ logger: false });
  setupApp(app);
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  return { app, url };
}
