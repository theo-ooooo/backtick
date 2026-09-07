import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestApp, readSuccess } from './helpers.mjs';

const source = {
  id: 'source-1',
  name: 'Tech Blog',
  siteUrl: 'https://example.com',
};
const post = {
  id: 'external-1',
  title: 'TypeScript',
  url: 'https://example.com/typescript',
  excerpt: null,
  author: null,
  thumbnail: null,
  likes: null,
  tags: ['typescript'],
  publishedAt: new Date('2026-08-01T00:00:00Z'),
  feed: source,
};
let app;
let url;
let sourceCall;
let postCall;
let countCall;
let calls = 0;

before(async () => {
  ({ app, url } = await createTestApp({
    feed: {
      findMany: async (args) => {
        sourceCall = args;
        return [{ ...source, description: null, _count: { posts: 12 } }];
      },
    },
    externalPost: {
      findMany: async (args) => {
        postCall = args;
        calls++;
        return args.where.feedId === 'missing' ? [] : [post];
      },
      count: async (args) => {
        countCall = args;
        return args.where.feedId === 'missing' ? 0 : 12;
      },
    },
  }));
});
after(async () => app?.close());

test('source list is scoped to enabled feeds and returns public metadata', async () => {
  const response = await fetch(url + '/api/v1/feeds');
  assert.equal(response.status, 200);
  assert.deepEqual(await readSuccess(response), [
    { ...source, description: null, postCount: 12 },
  ]);
  assert.deepEqual(sourceCall.where, { enabled: true });
  assert.deepEqual(sourceCall.orderBy, [{ name: 'asc' }, { id: 'asc' }]);
  assert.equal(sourceCall.select.rssUrl, undefined);
});

test('external posts support source/tag/search filters and bounded pagination', async () => {
  const response = await fetch(
    url +
      '/api/v1/feeds/posts?page=2&limit=5&feedId=source-1&tag=typescript&q=Type',
  );
  assert.equal(response.status, 200);
  const body = await readSuccess(response);
  assert.deepEqual(body.pagination, {
    page: 2,
    limit: 5,
    total: 12,
    totalPages: 3,
  });
  assert.deepEqual(body.items[0].source, source);
  assert.equal(body.items[0].feed, undefined);
  assert.equal(body.items[0].url, post.url);
  assert.deepEqual(postCall.where.feed, { enabled: true });
  assert.equal(postCall.where.feedId, 'source-1');
  assert.deepEqual(postCall.where.tags, { has: 'typescript' });
  assert.deepEqual(postCall.where.OR[0], {
    title: { contains: 'Type', mode: 'insensitive' },
  });
  assert.deepEqual(countCall.where, postCall.where);
  assert.equal(postCall.skip, 5);
  assert.equal(postCall.take, 5);
  assert.deepEqual(postCall.orderBy, [{ publishedAt: 'desc' }, { id: 'desc' }]);
});

test('default list still excludes disabled sources', async () => {
  const response = await fetch(url + '/api/v1/feeds/posts');
  assert.equal(response.status, 200);
  assert.deepEqual(postCall.where, { feed: { enabled: true } });
  assert.equal(postCall.skip, 0);
  assert.equal(postCall.take, 20);
});

test('unknown sources produce an empty paginated response', async () => {
  const response = await fetch(url + '/api/v1/feeds/posts?feedId=missing');
  assert.deepEqual(await readSuccess(response), {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
});

test('malformed filters fail before querying the database', async () => {
  for (const query of [
    'page=-1',
    'page=abc',
    'page=1.2',
    'limit=101',
    'limit=0',
    'enabled=false',
    'feedId=',
    'q=%20',
    'tag=x&tag=y',
  ]) {
    const beforeCalls = calls;
    const response = await fetch(url + '/api/v1/feeds/posts?' + query);
    assert.equal(response.status, 400, query);
    assert.equal(calls, beforeCalls, query);
  }
});

test('Swagger exposes source and external post contracts', async () => {
  const doc = await (await fetch(url + '/docs-json')).json();
  assert.ok(doc.paths['/api/v1/feeds']);
  assert.ok(
    doc.paths['/api/v1/feeds/posts'].get.parameters.some(
      (p) => p.name === 'feedId',
    ),
  );
  assert.ok(doc.components.schemas.FeedPostsPageDto);
});

test('search treats SQL wildcard and escape characters literally', async () => {
  const slash = String.fromCharCode(92);
  const cases = [
    ['%', slash + '%'],
    ['foo_bar', 'foo' + slash + '_bar'],
    ['path' + slash + 'file', 'path' + slash + slash + 'file'],
  ];
  for (const [q, expected] of cases) {
    const response = await fetch(
      url + '/api/v1/feeds/posts?' + new URLSearchParams({ q }),
    );
    assert.equal(response.status, 200);
    assert.equal(postCall.where.OR[0].title.contains, expected);
    assert.equal(postCall.where.OR[1].excerpt.contains, expected);
    assert.deepEqual(countCall.where, postCall.where);
  }
});
