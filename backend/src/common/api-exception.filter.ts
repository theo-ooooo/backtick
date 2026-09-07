import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import type { ApiErrorResponse } from './api-response.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest<{ route?: unknown }>();
    let status = 500;
    let message: string | string[] = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload: unknown = exception.getResponse();
      const candidate =
        typeof payload === 'string'
          ? payload
          : payload && typeof payload === 'object' && 'message' in payload
            ? payload.message
            : undefined;
      if (
        typeof candidate === 'string' ||
        (Array.isArray(candidate) &&
          candidate.every((item) => typeof item === 'string'))
      ) {
        message = candidate;
      } else {
        message = STATUS_CODES[status] ?? 'Request failed';
      }
    } else if (
      exception instanceof Error &&
      'statusCode' in exception &&
      'status' in exception &&
      'expose' in exception &&
      typeof exception.statusCode === 'number' &&
      exception.statusCode === exception.status &&
      typeof exception.expose === 'boolean'
    ) {
      // Express body-parser/http-errors (for example, a 413 payload limit).
      status = exception.statusCode;
      message = STATUS_CODES[status] ?? 'Request failed';
    }

    if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
    // Middleware parser errors and missing-route messages can echo submitted data.
    // Server errors must never return database details or stack traces.
    if (
      status >= 500 ||
      !request.route ||
      (status === 404 &&
        typeof message === 'string' &&
        /^Cannot [A-Z]+ /.test(message))
    ) {
      message = STATUS_CODES[status] ?? 'Request failed';
    }
    if (status >= 500) this.logger.error(exception);

    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    const body: ApiErrorResponse = { status, data: null, message };
    httpAdapter.reply(response, body, status);
  }
}
