import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createTestApp, readSuccess } from './helpers.mjs';

const defaultProfile = () => ({
  id: 'user-1',
  handle: 'theo',
  name: 'Theo',
  image: '/avatar.png',
  bio: '개발자',
  readme: '# About',
  githubUrl: 'https://github.com/theo-ooooo',
  websiteUrl: 'https://example.com',
  publicEmail: 'public@example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  _count: { posts: 13 },
  // Extra fields in the double must not accidentally become response fields.
  email: 'private-login@example.com',
  emailVerified: new Date(),
  passwordHash: 'private-hash',
  accounts: [{ access_token: 'private-token' }],
  sessions: [{ sessionToken: 'private-session' }],
});

const post = {
  id: 'post-1',
  slug: 'hello',
  title: 'Hello',
  excerpt: 'Public excerpt',
  coverImage: null,
  readMinutes: 2,
  views: 80,
  publishedAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-02T00:00:00Z'),
  author: { id: 'user-1', handle: 'theo', name: 'Theo', image: null },
  tags: [{ tag: { name: 'NestJS' } }],
  _count: { likes: 7 },
};

let app, url, profile, rows, total, failure;
const calls = { users: [], posts: [], counts: [] };
before(async () => {
  ({ app, url } = await createTestApp({
    user: {
      findUnique: async (query) => {
        calls.users.push(query);
        if (failure) throw failure;
        return query.where.handle === 'theo' ? profile : null;
      },
    },
    post: {
      findMany: async (query) => {
        calls.posts.push(query);
        return rows;
      },
      count: async (query) => {
        calls.counts.push(query);
        return total;
      },
    },
  }));
});
after(async () => app?.close());
beforeEach(() => {
  profile = defaultProfile();
  rows = [post];
  total = 13;
  failure = undefined;
  for (const values of Object.values(calls)) values.length = 0;
});

test('profile exposes only public fields and counts only published posts', async () => {
  const response = await fetch(url + '/api/v1/users/theo');
  assert.equal(response.status, 200);
  const data = await readSuccess(response);
  assert.deepEqual(data, {
    id: 'user-1',
    handle: 'theo',
    name: 'Theo',
    image: '/avatar.png',
    bio: '개발자',
    readme: '# About',
    githubUrl: 'https://github.com/theo-ooooo',
    websiteUrl: 'https://example.com',
    publicEmail: 'public@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    publishedPostCount: 13,
  });
  assert.deepEqual(calls.users[0].where, { handle: 'theo' });
  assert.deepEqual(calls.users[0].select._count, {
    select: { posts: { where: { status: 'PUBLISHED' } } },
  });
  for (const field of [
    'email',
    'emailVerified',
    'passwordHash',
    'accounts',
    'sessions',
    'posts',
    'reads',
    'bookmarks',
  ]) {
    assert.equal(calls.users[0].select[field], undefined, field);
    assert.equal(data[field], undefined, field);
  }
  assert.equal(JSON.stringify(data).includes('private-'), false);
});

test('optional profile fields stay null and publicEmail never falls back to login email', async () => {
  for (const key of [
    'name',
    'image',
    'bio',
    'readme',
    'githubUrl',
    'websiteUrl',
    'publicEmail',
  ])
    profile[key] = null;
  profile._count.posts = 0;
  const data = await readSuccess(await fetch(url + '/api/v1/users/theo'));
  assert.equal(data.name, null);
  assert.equal(data.handle, 'theo');
  assert.equal(data.publicEmail, null);
  assert.equal(data.publishedPostCount, 0);
  assert.equal(JSON.stringify(data).includes('private-login'), false);
});

test('handle lookup normalizes case, surrounding spaces and an optional @ once', async () => {
  for (const handle of ['THEO', '%40Theo', '%20%40THEO%20']) {
    const data = await readSuccess(
      await fetch(url + '/api/v1/users/' + handle),
    );
    assert.equal(data.handle, 'theo');
  }
  assert.ok(calls.users.every((query) => query.where.handle === 'theo'));
});

test('invalid handles and malformed URI encoding return 400 without database calls', async () => {
  for (const handle of [
    'ab',
    'a'.repeat(21),
    '@@theo',
    'the_o',
    '%ED%95%9C%EA%B8%80',
    '%2574heo',
    '%ZZ',
    '%E0%A4%A',
  ]) {
    const response = await fetch(url + '/api/v1/users/' + handle);
    assert.equal(response.status, 400, handle);
    const body = await response.json();
    assert.equal(body.status, 400);
    assert.equal(body.data, null);
    assert.ok(typeof body.message === 'string' || Array.isArray(body.message));
  }
  assert.equal(
    calls.users.length + calls.posts.length + calls.counts.length,
    0,
  );
});

test('all user routes return the same 404 for a missing public profile', async () => {
  for (const suffix of ['', '/posts', '/popular-posts']) {
    const response = await fetch(url + '/api/v1/users/missing' + suffix);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      status: 404,
      data: null,
      message: 'User not found',
    });
  }
  assert.equal(calls.posts.length + calls.counts.length, 0);
});

test('blog list uses public post summaries, bounded pagination and the path author', async () => {
  const response = await fetch(
    url + '/api/v1/users/%40THEO/posts?page=2&limit=5',
  );
  assert.equal(response.status, 200);
  const data = await readSuccess(response);
  assert.deepEqual(data.pagination, {
    page: 2,
    limit: 5,
    total: 13,
    totalPages: 3,
  });
  assert.deepEqual(data.items[0].tags, ['NestJS']);
  assert.equal(data.items[0].likes, 7);
  assert.equal(data.items[0].content, undefined);
  assert.deepEqual(calls.users[0].select, { id: true, handle: true });
  assert.equal(calls.posts[0].skip, 5);
  assert.equal(calls.posts[0].take, 5);
  assert.deepEqual(calls.posts[0].where, {
    status: 'PUBLISHED',
    author: { handle: 'theo' },
  });
  assert.deepEqual(calls.counts[0].where, calls.posts[0].where);
  assert.equal(calls.posts[0].select.content, undefined);
  assert.deepEqual(calls.posts[0].select.author.select, {
    id: true,
    handle: true,
    name: true,
    image: true,
  });
});

test('default blog page has twelve items per page and an empty blog is still 200', async () => {
  rows = [];
  total = 0;
  const response = await fetch(url + '/api/v1/users/theo/posts');
  assert.equal(response.status, 200);
  assert.deepEqual(await readSuccess(response), {
    items: [],
    pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  });
  assert.equal(calls.posts[0].take, 12);
  assert.equal(calls.posts[0].skip, 0);
});

test('popular posts use bounded views/date/id ordering and only public post fields', async () => {
  const response = await fetch(
    url + '/api/v1/users/theo/popular-posts?limit=2',
  );
  assert.equal(response.status, 200);
  const data = await readSuccess(response);
  assert.ok(Array.isArray(data));
  assert.equal(data[0].views, 80);
  assert.equal(data[0].likes, 7);
  assert.deepEqual(calls.posts[0].where, {
    status: 'PUBLISHED',
    author: { handle: 'theo' },
  });
  assert.deepEqual(calls.posts[0].orderBy, [
    { views: 'desc' },
    { publishedAt: { sort: 'desc', nulls: 'last' } },
    { id: 'desc' },
  ]);
  assert.equal(calls.posts[0].take, 2);
  assert.equal(calls.posts[0].select.content, undefined);
  assert.equal(calls.counts.length, 0);
});

test('popular posts default to three and an existing empty blog returns an empty array', async () => {
  rows = [];
  const response = await fetch(url + '/api/v1/users/theo/popular-posts');
  assert.equal(response.status, 200);
  assert.deepEqual(await readSuccess(response), []);
  assert.equal(calls.posts[0].take, 3);
});

test('invalid list queries cannot override the author or reach the database', async () => {
  for (const suffix of [
    '/posts?page=0',
    '/posts?page=10001',
    '/posts?limit=101',
    '/posts?limit=0',
    '/posts?limit=1.5',
    '/posts?page=1&page=2',
    '/posts?limit[x]=1',
    '/posts?author=other',
    '/posts?status=DRAFT',
    '/posts?q=test',
    '/popular-posts?limit=0',
    '/popular-posts?limit=101',
    '/popular-posts?limit=NaN',
    '/popular-posts?limit=1&limit=2',
    '/popular-posts?page=2',
    '/popular-posts?author=other',
  ]) {
    const response = await fetch(url + '/api/v1/users/theo' + suffix);
    assert.equal(response.status, 400, suffix);
    const body = await response.json();
    assert.equal(body.status, 400);
    assert.equal(body.data, null);
    assert.ok(Array.isArray(body.message));
  }
  assert.equal(
    calls.users.length + calls.posts.length + calls.counts.length,
    0,
  );
});

test('user database errors use the common safe 500 envelope', async () => {
  failure = new Error('private database connection details');
  for (const suffix of ['', '/posts', '/popular-posts']) {
    const response = await fetch(url + '/api/v1/users/theo' + suffix);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      status: 500,
      data: null,
      message: 'Internal Server Error',
    });
  }
});

test('Swagger describes the handle, defaults and common response shapes', async () => {
  const spec = await (await fetch(url + '/docs-json')).json();
  for (const suffix of ['', '/posts', '/popular-posts']) {
    const operation = spec.paths['/api/v1/users/{handle}' + suffix].get;
    const handle = operation.parameters.find((p) => p.name === 'handle');
    assert.equal(handle.in, 'path');
    assert.equal(handle.required, true);
    assert.equal(handle.schema.pattern, '^@?[a-zA-Z0-9-]{3,20}$');
    const success =
      operation.responses['200'].content['application/json'].schema;
    assert.deepEqual(success.required, ['status', 'data']);
    for (const code of [400, 404, 500]) assert.ok(operation.responses[code]);
  }
  const list = spec.paths['/api/v1/users/{handle}/posts'].get;
  assert.equal(
    list.parameters.find((p) => p.name === 'page').schema.default,
    1,
  );
  assert.equal(
    list.parameters.find((p) => p.name === 'limit').schema.default,
    12,
  );
  const popular = spec.paths['/api/v1/users/{handle}/popular-posts'].get;
  assert.equal(
    popular.parameters.find((p) => p.name === 'limit').schema.default,
    3,
  );
  assert.equal(
    popular.responses['200'].content['application/json'].schema.properties.data
      .type,
    'array',
  );
  assert.equal(
    spec.components.schemas.UserProfileDto.properties.email,
    undefined,
  );
  assert.ok(spec.components.schemas.UserProfileDto.properties.publicEmail);
});
