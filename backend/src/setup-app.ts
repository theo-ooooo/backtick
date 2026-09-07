import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiResponseInterceptor } from './common/api-response.interceptor.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { apiErrorSchema } from './common/api-response.decorator.js';

export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Safari upgrades localhost asset requests to HTTPS with this directive.
          upgradeInsecureRequests:
            config.getOrThrow<string>('NODE_ENV') === 'production' ? [] : null,
        },
      },
    }),
  );
  // Nest 12's Express fallback handlers also mount this value as a literal path.
  app.setGlobalPrefix('/api/v1');
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));
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
      .addGlobalResponse({
        status: 500,
        description: 'Internal server error',
        schema: apiErrorSchema(500),
      })
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }
}
