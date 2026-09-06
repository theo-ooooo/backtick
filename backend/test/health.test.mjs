import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestApp } from './helpers.mjs';

let app;
let url;
let available = true;
before(async () => {
  ({ app, url } = await createTestApp({
    $queryRaw: async () => {
      if (!available) throw new Error('private connection details');
      return [{ '?column?': 1 }];
    },
  }));
});
after(async () => app?.close());

test('liveness returns JSON and security headers', async () => {
  const response = await fetch(url + '/api/v1/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'backtick-backend',
  });
});

test('readiness reports database health and redacts failures', async () => {
  assert.equal((await fetch(url + '/api/v1/health/ready')).status, 200);
  available = false;
  try {
    const response = await fetch(url + '/api/v1/health/ready');
    assert.equal(response.status, 503);
    assert.equal((await response.json()).message, 'Database is unavailable');
    assert.equal((await fetch(url + '/api/v1/health')).status, 200);
  } finally {
    available = true;
  }
});

test('CORS permits only configured origins', async () => {
  const allowed = await fetch(url + '/api/v1/health', {
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.equal(
    allowed.headers.get('access-control-allow-origin'),
    'http://localhost:3000',
  );
  const denied = await fetch(url + '/api/v1/health', {
    headers: { Origin: 'https://unknown.example' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('Swagger publishes the versioned routes', async () => {
  const response = await fetch(url + '/docs-json');
  assert.equal(response.status, 200);
  assert.ok((await response.json()).paths['/api/v1/health/ready']);
});
