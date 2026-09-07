import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnvironment } from '../dist/config/environment.js';

const base = { DATABASE_URL: 'postgresql://test:test@localhost:5432/backtick' };

test('production defaults disable Swagger and cross-origin access', () => {
  const env = validateEnvironment({ ...base, NODE_ENV: 'production' });
  assert.equal(env.PORT, 4000);
  assert.equal(env.SWAGGER_ENABLED, false);
  assert.deepEqual(env.CORS_ORIGINS, []);
});

test('invalid configuration fails without revealing credentials', () => {
  for (const PORT of ['abc', '0', '-1', '65536', '4.2', '']) {
    assert.throws(() => validateEnvironment({ ...base, PORT }), /PORT/);
  }
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: 'https://user:private@db' }),
    { message: 'DATABASE_URL must be a PostgreSQL connection URL' },
  );
  for (const CORS_ORIGINS of [
    '*',
    'https://example.com/path',
    'https://example.com/',
  ]) {
    assert.throws(
      () => validateEnvironment({ ...base, CORS_ORIGINS }),
      /CORS_ORIGINS/,
    );
  }
  assert.throws(
    () => validateEnvironment({ ...base, SWAGGER_ENABLED: 'yes' }),
    /SWAGGER_ENABLED/,
  );
});
