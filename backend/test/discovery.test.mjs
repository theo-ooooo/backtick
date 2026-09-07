import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createTestApp, readSuccess } from './helpers.mjs';

const nativePost = (id, publishedAt) => ({
  id,
  title: `Native ${id}`,
  slug: '한글/100%',
  excerpt: 'Native excerpt',
  coverImage: '/uploads/cover.png',
  views: 12,
  readMinutes: 3,
  publishedAt: publishedAt ? new Date(publishedAt) : null,
  author: { handle: 'theo', name: 'Theo', image: null },
  tags: [{ tag: { name: 'TypeScript' } }],
  _count: { likes: 2 },
});
const externalPost = (id, publishedAt) => ({
  id,
  title: `External ${id}`,
  url: `https://example.com/${id}`,
  excerpt: 'External excerpt',
  author: 'Author',
  thumbnail: null,
  likes: null,
  tags: ['TypeScript'],
  publishedAt: new Date(publishedAt),
  feed: { name: 'Example Blog' },
});

let app, url, nativeRows, externalRows, aggregateRows, failure;
const calls = { native: [], external: [], aggregate: [] };
before(async () => {
  ({ app, url } = await createTestApp({
    post: {
      findMany: async (query) => {
        calls.native.push(query);
        if (failure) throw failure;
        return nativeRows.slice(0, query.take);
      },
    },
    externalPost: {
      findMany: async (query) => {
        calls.external.push(query);
        return externalRows.slice(0, query.take);
      },
    },
    $queryRaw: async (query) => {
      calls.aggregate.push(query);
      return aggregateRows;
    },
  }));
});
after(async () => app?.close());
beforeEach(() => {
  nativeRows = [];
  externalRows = [];
  aggregateRows = [];
  failure = undefined;
  for (const entries of Object.values(calls)) entries.length = 0;
});

test('search merges both sources by time and applies a single final limit', async () => {
  nativeRows = [nativePost('n2', '2026-09-03'), nativePost('n1', '2026-09-01')];
  externalRows = [
    externalPost('e2', '2026-09-04'),
    externalPost('e1', '2026-09-02'),
  ];
  const data = await readSuccess(
    await fetch(url + '/api/v1/search?q=TypeScript&limit=3'),
  );
  assert.deepEqual(
    data.items.map(({ id }) => id),
    ['e2', 'n2', 'e1'],
  );
  assert.equal(data.items[0].source, 'Example Blog');
  assert.equal(data.items[0].authorHandle, null);
  assert.equal(data.items[1].url, '/@theo/%ED%95%9C%EA%B8%80%2F100%25');
  assert.deepEqual(data.items[1].tags, ['TypeScript']);
  assert.equal(data.items[1].likes, 2);
  assert.equal(data.items[1].source, null);
  for (const query of [calls.native[0], calls.external[0]])
    assert.equal(query.take, 3);
  assert.equal(calls.native[0].where.status, 'PUBLISHED');
  assert.deepEqual(calls.native[0].where.author, { handle: { not: null } });
  assert.deepEqual(calls.external[0].where.feed, { enabled: true });
  assert.equal(calls.native[0].select.content, undefined);
});

test('search trims text, searches native content and treats LIKE wildcards literally', async () => {
  const q = '  100%_\\  ';
  await readSuccess(
    await fetch(url + '/api/v1/search?' + new URLSearchParams({ q })),
  );
  const literal = '100\\%\\_\\\\';
  assert.deepEqual(calls.native[0].where.OR, [
    { title: { contains: literal, mode: 'insensitive' } },
    { content: { contains: literal, mode: 'insensitive' } },
  ]);
  assert.deepEqual(calls.external[0].where.OR, [
    { title: { contains: literal, mode: 'insensitive' } },
    { excerpt: { contains: literal, mode: 'insensitive' } },
  ]);
  assert.equal(calls.native[0].take, 30);
});

test('equal timestamps have stable ordering and missing native dates sort last', async () => {
  nativeRows = [
    nativePost('n2', '2026-09-03'),
    nativePost('n1', '2026-09-03'),
    nativePost('n0', null),
  ];
  externalRows = [
    externalPost('e2', '2026-09-03'),
    externalPost('e1', '2026-09-01'),
  ];
  const { items } = await readSuccess(
    await fetch(url + '/api/v1/search?q=test'),
  );
  assert.deepEqual(
    items.map(({ id }) => id),
    ['n2', 'n1', 'e2', 'e1', 'n0'],
  );
  assert.equal(items.at(-1).publishedAt, null);
  assert.deepEqual(calls.native[0].orderBy[0], {
    publishedAt: { sort: 'desc', nulls: 'last' },
  });
});

test('quick search skips the database for empty or one-character terms', async () => {
  for (const query of ['', '?q=', '?q=%20a%20']) {
    assert.deepEqual(
      await readSuccess(await fetch(url + '/api/v1/search/quick' + query)),
      { items: [] },
    );
  }
  assert.equal(calls.native.length + calls.external.length, 0);
});

test('quick search caps the combined results at eight and exposes only display fields', async () => {
  nativeRows = Array.from({ length: 8 }, (_, i) =>
    nativePost(`n${8 - i}`, '2026-09-03'),
  );
  externalRows = [externalPost('e1', '2026-09-04')];
  const { items } = await readSuccess(
    await fetch(url + '/api/v1/search/quick?q=TypeScript'),
  );
  assert.equal(items.length, 8);
  assert.deepEqual(items[0], {
    title: 'External e1',
    url: 'https://example.com/e1',
    kind: 'external',
    source: 'Example Blog',
  });
  assert.equal(items[1].source, 'Theo');
  assert.deepEqual(Object.keys(items[1]).sort(), [
    'kind',
    'source',
    'title',
    'url',
  ]);
  assert.equal(calls.native[0].take, 8);
  assert.equal(calls.external[0].take, 8);
});

test('authors without a display name fall back to their public handle', async () => {
  const post = nativePost('n1', '2026-09-03');
  post.author.name = null;
  nativeRows = [post];
  const full = await readSuccess(await fetch(url + '/api/v1/search?q=test'));
  assert.equal(full.items[0].author, 'theo');
  const quick = await readSuccess(
    await fetch(url + '/api/v1/search/quick?q=test'),
  );
  assert.equal(quick.items[0].source, 'theo');
});

test('tag posts preserve case, plus, slash and literal percent encoding', async () => {
  const tag = ' C++/React%2F ';
  const { items } = await readSuccess(
    await fetch(url + '/api/v1/tags/posts?' + new URLSearchParams({ tag })),
  );
  assert.deepEqual(items, []);
  assert.deepEqual(calls.native[0].where.tags, {
    some: { tag: { name: 'C++/React%2F' } },
  });
  assert.deepEqual(calls.external[0].where.tags, { has: 'C++/React%2F' });
  assert.equal(calls.native[0].where.status, 'PUBLISHED');
  assert.deepEqual(calls.external[0].where.feed, { enabled: true });
  assert.equal(calls.native[0].take, 40);
});

test('invalid filters return common 400s before any database operation', async () => {
  for (const path of [
    '/search',
    '/search?q=%20',
    '/search?q=x&limit=0',
    '/search?q=x&limit=101',
    '/search?q=x&limit=1.5',
    '/search?q=a&q=b',
    '/search?q=x&limit=1&limit=2',
    '/search?q=x&page=2',
    '/search?q=' + 'x'.repeat(101),
    '/search/quick?q=' + 'x'.repeat(101),
    '/search/quick?q=a&q=b',
    '/search/quick?q=test&limit=1',
    '/tags/posts',
    '/tags/posts?tag=%20',
    '/tags/posts?tag=a&tag=b',
    '/tags/posts?tag=x&limit=101',
    '/tags?limit=0',
    '/tags?limit=Infinity',
    '/tags?limit=101',
    '/tags/trending?limit=101',
    '/tags/trending?feedId=private',
  ]) {
    const response = await fetch(url + '/api/v1' + path);
    assert.equal(response.status, 400, path);
    const body = await response.json();
    assert.equal(body.status, 400, path);
    assert.equal(body.data, null, path);
    assert.ok(Array.isArray(body.message), path);
  }
  assert.equal(
    calls.native.length + calls.external.length + calls.aggregate.length,
    0,
  );
});

test('tag counts serialize PostgreSQL bigint and bind a bounded limit', async () => {
  aggregateRows = [
    { name: 'TypeScript', count: 12n },
    { name: 'C++', count: 3n },
  ];
  assert.deepEqual(
    await readSuccess(await fetch(url + '/api/v1/tags?limit=2')),
    [
      { name: 'TypeScript', count: 12 },
      { name: 'C++', count: 3 },
    ],
  );
  const query = calls.aggregate[0];
  assert.deepEqual(query.values, [2]);
  assert.match(query.text, /p\.status = 'PUBLISHED' AND u\.handle IS NOT NULL/);
  assert.match(query.text, /f\.enabled = true/);
  assert.match(query.text, /UNION\s+SELECT e\.id, 'external'/);
  assert.match(query.text, /LIMIT \$1/);
});

test('trending aggregates only active external posts in the 30-day window', async () => {
  aggregateRows = [{ name: 'React', count: 2n }];
  assert.deepEqual(
    await readSuccess(await fetch(url + '/api/v1/tags/trending')),
    [{ name: 'React', count: 2 }],
  );
  const query = calls.aggregate[0];
  assert.deepEqual(query.values, [6]);
  assert.match(query.text, /SELECT DISTINCT e\.id, tag\.name/);
  assert.match(query.text, /f\.enabled = true/);
  assert.match(query.text, /NOW\(\) - INTERVAL '30 days'/);
  assert.match(query.text, /HAVING COUNT\(\*\) >= 2/);
});

test('discovery failures use the common safe 500 response', async () => {
  failure = new Error('private database details');
  const response = await fetch(url + '/api/v1/search?q=test');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    status: 500,
    data: null,
    message: 'Internal Server Error',
  });
});

test('Swagger describes all discovery routes with success and error envelopes', async () => {
  const spec = await (await fetch(url + '/docs-json')).json();
  for (const path of [
    '/search',
    '/search/quick',
    '/tags',
    '/tags/posts',
    '/tags/trending',
  ]) {
    const operation = spec.paths['/api/v1' + path].get;
    const success =
      operation.responses['200'].content['application/json'].schema;
    assert.deepEqual(success.required, ['status', 'data']);
    assert.deepEqual(success.properties.status.enum, [200]);
    const failureSchema =
      operation.responses['400'].content['application/json'].schema;
    assert.deepEqual(failureSchema.required, ['status', 'data', 'message']);
    assert.ok(operation.responses['500']);
  }
  const limits = ['/search', '/tags', '/tags/posts', '/tags/trending'].map(
    (path) =>
      spec.paths['/api/v1' + path].get.parameters.find(
        (p) => p.name === 'limit',
      ).schema.default,
  );
  assert.deepEqual(limits, [30, 100, 40, 6]);
});
