import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService);
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.getOrThrow<string[]>('CORS_ORIGINS') });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  if (config.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const options = new DocumentBuilder()
      .setTitle('Backtick API')
      .setDescription('Backtick NestJS backend')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }
}
