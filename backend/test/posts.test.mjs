import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createTestApp } from './helpers.mjs';

const row = {
  id: 'public-post',
  title: 'NestJS',
  slug: 'nestjs',
  excerpt: 'API',
  coverImage: null,
  readMinutes: 2,
  views: 10,
  publishedAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
  author: { id: 'author', handle: 'theo', name: 'Theo', image: null },
  tags: [{ tag: { name: 'nestjs' } }],
  _count: { likes: 3 },
};
let app;
let url;
let listCall;
let countCall;
let detailCall;
let calls = 0;

before(async () => {
  ({ app, url } = await createTestApp({
    post: {
      findMany: async (args) => {
        listCall = args;
        calls++;
        return [row];
      },
      count: async (args) => {
        countCall = args;
        return 21;
      },
      findFirst: async (args) => {
        detailCall = args;
        return args.where.id === row.id
          ? { ...row, content: '# Hello', summary: null }
          : null;
      },
    },
  }));
});
after(async () => app?.close());

test('list applies public filters, stable order and numeric pagination', async () => {
  const response = await fetch(
    url + '/api/v1/posts?page=2&limit=10&author=THEO&tag=nestjs&q=API',
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.pagination, {
    page: 2,
    limit: 10,
    total: 21,
    totalPages: 3,
  });
  assert.equal(listCall.skip, 10);
  assert.equal(listCall.take, 10);
  assert.equal(listCall.where.status, 'PUBLISHED');
  assert.deepEqual(listCall.where.author, { handle: 'theo' });
  assert.deepEqual(listCall.where.tags, { some: { tag: { name: 'nestjs' } } });
  assert.deepEqual(listCall.where.OR[0], {
    title: { contains: 'API', mode: 'insensitive' },
  });
  assert.deepEqual(countCall.where, listCall.where);
  assert.deepEqual(listCall.orderBy, [{ publishedAt: 'desc' }, { id: 'desc' }]);
  assert.deepEqual(body.items[0].tags, ['nestjs']);
  assert.equal(body.items[0].likes, 3);
});

test('list selects only public author fields and omits post bodies', async () => {
  const response = await fetch(url + '/api/v1/posts');
  const body = await response.json();
  assert.deepEqual(listCall.where.author, { handle: { not: null } });
  assert.deepEqual(Object.keys(listCall.select.author.select).sort(), [
    'handle',
    'id',
    'image',
    'name',
  ]);
  assert.equal(listCall.select.content, undefined);
  assert.equal(body.items[0].content, undefined);
  assert.deepEqual(body.items[0].author, row.author);
  assert.equal(body.pagination.page, 1);
});

test('invalid pagination and unrecognized/private filters fail before database access', async () => {
  for (const query of [
    'page=0',
    'page=1.5',
    'page=abc',
    'page=10001',
    'limit=101',
    'limit=0',
    'limit=',
    'status=DRAFT',
    'author=',
    'q=%20',
    'page=1&page=2',
  ]) {
    const beforeCalls = calls;
    const response = await fetch(url + '/api/v1/posts?' + query);
    assert.equal(response.status, 400, query);
    assert.equal(calls, beforeCalls, query);
  }
});

test('detail exposes published content and scopes lookup to public posts', async () => {
  const response = await fetch(url + '/api/v1/posts/public-post');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).content, '# Hello');
  assert.deepEqual(detailCall.where, {
    id: 'public-post',
    status: 'PUBLISHED',
    author: { handle: { not: null } },
  });
  assert.deepEqual(Object.keys(detailCall.select.author.select).sort(), [
    'handle',
    'id',
    'image',
    'name',
  ]);
});

test('missing and draft posts return the same 404', async () => {
  for (const id of ['missing', 'draft-post']) {
    const response = await fetch(url + '/api/v1/posts/' + id);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, 'Post not found');
    assert.equal(detailCall.where.status, 'PUBLISHED');
  }
});

test('Swagger describes list filters and response schemas', async () => {
  const doc = await (await fetch(url + '/docs-json')).json();
  const route = doc.paths['/api/v1/posts'].get;
  assert.ok(route.parameters.some((parameter) => parameter.name === 'page'));
  assert.ok(doc.components.schemas.PostsPageDto);
  assert.ok(doc.components.schemas.PostDetailDto);
});
