import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from './api-response.js';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ApiResponse<T | null> | undefined
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiResponse<T | null> | undefined> {
    if (
      context.getType() !== 'http' ||
      Reflect.getMetadata(SSE_METADATA, context.getHandler()) ||
      Reflect.getMetadata(REDIRECT_METADATA, context.getHandler())
    ) {
      return next.handle();
    }
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data;
        // HTTP no-content responses must stay bodyless.
        if (response.statusCode === 204 || response.statusCode === 205) {
          return undefined;
        }
        return { status: response.statusCode, data: data ?? null };
      }),
    );
  }
}
