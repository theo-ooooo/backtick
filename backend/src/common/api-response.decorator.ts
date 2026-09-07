import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';

export function apiErrorSchema(status: number): SchemaObject {
  return {
    type: 'object',
    required: ['status', 'data', 'message'],
    properties: {
      status: { type: 'integer', enum: [status], example: status },
      data: { type: 'object', nullable: true, enum: [null], example: null },
      message: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
    },
  };
}

export function ApiErrorResponse(status: number, description?: string) {
  return ApiResponse({ status, description, schema: apiErrorSchema(status) });
}

export function ApiSuccessResponse(
  model: Type<unknown>,
  options: { isArray?: boolean; status?: number; description?: string } = {},
) {
  const status = options.status ?? 200;
  const item = { $ref: getSchemaPath(model) };
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description: options.description,
      schema: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'integer', enum: [status], example: status },
          data: options.isArray ? { type: 'array', items: item } : item,
        },
      },
    }),
  );
}
