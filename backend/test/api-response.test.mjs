import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  StreamableFile,
  Sse,
  Redirect,
} from '@nestjs/common';
import { of } from 'rxjs';
import { createTestApp, readSuccess } from './helpers.mjs';

class ContractController {
  file() {
    return new StreamableFile(Buffer.from('file payload'), {
      type: 'text/plain',
    });
  }
  events() {
    return of({ id: 'event-42', type: 'greeting', data: { text: 'hello' } });
  }
  redirect() {
    return { url: '/api/v1/health', statusCode: 307 };
  }
  created() {
    return { id: 'created' };
  }
  accepted() {
    return false;
  }
  empty() {
    return { ignored: true };
  }
  nothing() {
    return undefined;
  }
  domainStatus() {
    return { status: 'published', data: ['domain value'] };
  }
  unauthorized() {
    throw new UnauthorizedException('Sign in required');
  }
  forbidden() {
    throw new ForbiddenException('Not allowed');
  }
  conflict() {
    throw new ConflictException('Already exists');
  }
  limited() {
    throw new HttpException('Too many requests', 429);
  }
  crash() {
    throw new Error('postgresql://user:private-password@database');
  }
  serverError() {
    throw new HttpException('secret database error', 500);
  }
}
Controller('contract-test')(ContractController);
for (const [name, decorator, code] of [
  ['created', Post('created')],
  ['accepted', Post('accepted'), 202],
  ['empty', Delete('empty'), 204],
  ['nothing', Get('nothing')],
  ['domainStatus', Get('domain-status')],
  ['unauthorized', Get('unauthorized')],
  ['forbidden', Get('forbidden')],
  ['conflict', Get('conflict')],
  ['limited', Get('limited')],
  ['crash', Get('crash')],
  ['serverError', Get('server-error')],
  ['file', Get('file')],
  ['events', Sse('events')],
  ['redirect', Get('redirect')],
]) {
  const descriptor = Object.getOwnPropertyDescriptor(
    ContractController.prototype,
    name,
  );
  decorator(ContractController.prototype, name, descriptor);
  if (code) HttpCode(code)(ContractController.prototype, name, descriptor);
}

Redirect('/fallback', 302)(
  ContractController.prototype,
  'redirect',
  Object.getOwnPropertyDescriptor(ContractController.prototype, 'redirect'),
);

let app;
let url;
before(async () => {
  ({ app, url } = await createTestApp(
    { post: { findMany: async () => [], count: async () => 0 } },
    [ContractController],
  ));
});
after(async () => app?.close());

test('files, SSE events and dynamic redirects preserve their transport contracts', async () => {
  const file = await fetch(url + '/api/v1/contract-test/file');
  assert.match(file.headers.get('content-type'), /^text\/plain/);
  assert.equal(await file.text(), 'file payload');
  const events = await fetch(url + '/api/v1/contract-test/events');
  assert.match(events.headers.get('content-type'), /^text\/event-stream/);
  const event = await events.text();
  assert.match(event, /event: greeting/);
  assert.match(event, /id: event-42/);
  assert.match(event, /data: \{"text":"hello"\}/);
  const redirect = await fetch(url + '/api/v1/contract-test/redirect', {
    redirect: 'manual',
  });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), '/api/v1/health');
});

test('success envelope keeps actual 201/202 codes, false, null and domain fields', async () => {
  const created = await fetch(url + '/api/v1/contract-test/created', {
    method: 'POST',
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await readSuccess(created), { id: 'created' });
  const accepted = await fetch(url + '/api/v1/contract-test/accepted', {
    method: 'POST',
  });
  assert.equal(accepted.status, 202);
  assert.equal(await readSuccess(accepted), false);
  assert.equal(
    await readSuccess(await fetch(url + '/api/v1/contract-test/nothing')),
    null,
  );
  assert.deepEqual(
    await readSuccess(await fetch(url + '/api/v1/contract-test/domain-status')),
    { status: 'published', data: ['domain value'] },
  );
});

test('204 and HEAD responses remain bodyless', async () => {
  const empty = await fetch(url + '/api/v1/contract-test/empty', {
    method: 'DELETE',
  });
  assert.equal(empty.status, 204);
  assert.equal(await empty.text(), '');
  const head = await fetch(url + '/api/v1/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('validation arrays are preserved within the common 400 response', async () => {
  const response = await fetch(
    url + '/api/v1/posts?page=0&secret=private-value',
  );
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.status, 400);
  assert.equal(body.data, null);
  assert.ok(Array.isArray(body.message));
  assert.ok(body.message.some((message) => message.includes('page')));
  assert.equal(JSON.stringify(body).includes('private-value'), false);
});

test('401, 403, 409 and 429 keep their status and public messages', async () => {
  for (const [path, status, message] of [
    ['unauthorized', 401, 'Sign in required'],
    ['forbidden', 403, 'Not allowed'],
    ['conflict', 409, 'Already exists'],
    ['limited', 429, 'Too many requests'],
  ]) {
    const response = await fetch(url + '/api/v1/contract-test/' + path);
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { status, data: null, message });
  }
});

test('unknown paths and malformed JSON have the same envelope without input leakage', async () => {
  const missing = await fetch(url + '/api/v1/missing?token=private-token');
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), {
    status: 404,
    data: null,
    message: 'Not Found',
  });
  const malformed = await fetch(url + '/api/v1/contract-test/created', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'private-body-is-not-json',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), {
    status: 400,
    data: null,
    message: 'Bad Request',
  });
});

test('body-parser size errors keep HTTP 413 and the common error envelope', async () => {
  const response = await fetch(url + '/api/v1/contract-test/created', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'x'.repeat(150_000) }),
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    status: 413,
    data: null,
    message: 'Payload Too Large',
  });
});

test('unexpected exceptions and explicit 500s never expose internals', async () => {
  for (const path of ['crash', 'server-error']) {
    const response = await fetch(url + '/api/v1/contract-test/' + path);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      status: 500,
      data: null,
      message: 'Internal Server Error',
    });
  }
});

test('Swagger stays raw OpenAPI and documents object, array and error envelopes', async () => {
  const doc = await (await fetch(url + '/docs-json')).json();
  assert.equal(doc.data, undefined);
  assert.ok(doc.openapi);
  const schema = (path, status) =>
    doc.paths[path].get.responses[status].content['application/json'].schema;
  assert.equal(
    schema('/api/v1/posts', 200).properties.data.$ref,
    '#/components/schemas/PostsPageDto',
  );
  assert.equal(schema('/api/v1/feeds', 200).properties.data.type, 'array');
  for (const [path, status] of [
    ['/api/v1/posts', 400],
    ['/api/v1/posts/{id}', 404],
    ['/api/v1/health/ready', 503],
    ['/api/v1/posts', 500],
  ]) {
    assert.deepEqual(schema(path, status).required, [
      'status',
      'data',
      'message',
    ]);
    assert.deepEqual(schema(path, status).properties.status.enum, [status]);
    assert.deepEqual(schema(path, status).properties.data.enum, [null]);
  }
});
