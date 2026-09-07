import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createTestApp, readSuccess } from './helpers.mjs';

const comment = (id, overrides = {}) => ({
  id,
  authorId: 'commenter-1',
  replyToName: null,
  content: 'Public comment',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  deletedAt: null,
  author: {
    name: 'Theo',
    handle: 'theo',
    image: null,
    email: 'private@example.com',
    passwordHash: 'private-hash',
  },
  _count: { replies: 3 },
  ...overrides,
});
let app, url, postVisible, threadVisible, rows, total, liveCount, failure;
const calls = { post: [], thread: [], rows: [], counts: [] };
before(async () => {
  ({ app, url } = await createTestApp({
    post: {
      findFirst: async (query) => {
        calls.post.push(query);
        return postVisible ? { id: 'post-1' } : null;
      },
    },
    comment: {
      findFirst: async (query) => {
        calls.thread.push(query);
        return threadVisible &&
          query.where.postId === 'post-1' &&
          query.where.id === 'root-1'
          ? { id: 'root-1' }
          : null;
      },
      findMany: async (query) => {
        calls.rows.push(query);
        if (failure) throw failure;
        return rows;
      },
      count: async (query) => {
        calls.counts.push(query);
        return query.where.deletedAt === null ? liveCount : total;
      },
    },
  }));
});
after(async () => app?.close());
beforeEach(() => {
  postVisible = true;
  threadVisible = true;
  rows = [comment('root-1')];
  total = 5;
  liveCount = 12;
  failure = undefined;
  for (const list of Object.values(calls)) list.length = 0;
});

test('thread page returns public comment fields and distinct thread/live counts', async () => {
  const response = await fetch(
    url + '/api/v1/posts/post-1/comments?page=2&limit=2',
  );
  assert.equal(response.status, 200);
  const data = await readSuccess(response);
  assert.deepEqual(data.pagination, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
  });
  assert.equal(data.commentCount, 12);
  assert.deepEqual(data.items[0], {
    id: 'root-1',
    authorId: 'commenter-1',
    authorName: 'Theo',
    authorHandle: 'theo',
    authorImage: null,
    replyToName: null,
    content: 'Public comment',
    deleted: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    replyCount: 3,
  });
  assert.equal(JSON.stringify(data).includes('private'), false);
  assert.equal(calls.rows[0].skip, 2);
  assert.equal(calls.rows[0].take, 2);
  assert.equal(calls.rows[0].select.replies, undefined);
  assert.deepEqual(calls.rows[0].select.author.select, {
    name: true,
    handle: true,
    image: true,
  });
  assert.deepEqual(calls.rows[0].orderBy, [
    { createdAt: 'asc' },
    { id: 'asc' },
  ]);
});

test('public post and valid two-level thread conditions scope every read and count', async () => {
  await readSuccess(await fetch(url + '/api/v1/posts/post-1/comments'));
  const publicPost = { status: 'PUBLISHED', author: { handle: { not: null } } };
  assert.deepEqual(calls.post[0].where, { id: 'post-1', ...publicPost });
  for (const query of [...calls.rows, ...calls.counts]) {
    assert.equal(query.where.postId, 'post-1');
    assert.deepEqual(query.where.post, publicPost);
  }
  const root = calls.rows[0];
  assert.equal(root.where.parentId, null);
  assert.deepEqual(root.where.OR, [
    { deletedAt: null },
    { replies: { some: { postId: 'post-1' } } },
  ]);
  assert.deepEqual(root.select._count.select.replies.where, {
    postId: 'post-1',
  });
  assert.deepEqual(calls.counts[0].where, root.where);
  assert.deepEqual(calls.counts[1].where.OR, [
    { parentId: null },
    { parent: { postId: 'post-1', parentId: null } },
  ]);
});

test('deleted bodies stay empty and author display preserves name/handle/anonymous fallback', async () => {
  rows = [
    comment('root-1', {
      content: 'deleted-secret-body',
      deletedAt: new Date(),
      author: { name: null, handle: 'theo', image: null },
    }),
    comment('root-2', { author: { name: null, handle: null, image: null } }),
  ];
  const data = await readSuccess(
    await fetch(url + '/api/v1/posts/post-1/comments'),
  );
  assert.equal(data.items[0].content, '');
  assert.equal(data.items[0].deleted, true);
  assert.equal(data.items[0].authorName, 'theo');
  assert.equal(data.items[1].authorName, '익명');
  assert.equal(data.items[1].content, 'Public comment');
  assert.equal(JSON.stringify(data).includes('deleted-secret-body'), false);
  assert.equal(data.items[0].deletedAt, undefined);
});

test('missing or non-public posts stop before comment access with a common 404', async () => {
  postVisible = false;
  const response = await fetch(url + '/api/v1/posts/post-1/comments');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    status: 404,
    data: null,
    message: 'Post not found',
  });
  assert.equal(calls.rows.length + calls.counts.length, 0);
});

test('reply pages are bounded to one public root and retain deleted placeholders', async () => {
  rows = [
    comment('reply-1', {
      deletedAt: new Date(),
      content: 'private-deleted-reply',
      replyToName: 'Someone',
    }),
  ];
  const response = await fetch(
    url + '/api/v1/posts/post-1/comments/root-1/replies?page=2&limit=2',
  );
  assert.equal(response.status, 200);
  const data = await readSuccess(response);
  assert.deepEqual(data.pagination, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
  });
  assert.equal(data.items[0].replyToName, 'Someone');
  assert.equal(data.items[0].content, '');
  assert.equal(data.items[0].deleted, true);
  assert.equal(data.items[0].replyCount, undefined);
  assert.equal(data.items[0]._count, undefined);
  assert.equal(calls.thread[0].where.postId, 'post-1');
  assert.equal(calls.thread[0].where.parentId, null);
  assert.equal(calls.thread[0].where.post.status, 'PUBLISHED');
  assert.deepEqual(calls.rows[0].where.parent, {
    postId: 'post-1',
    parentId: null,
  });
  assert.equal(calls.rows[0].where.parentId, 'root-1');
  assert.equal(calls.rows[0].where.post.status, 'PUBLISHED');
  assert.deepEqual(calls.counts[0].where, calls.rows[0].where);
  assert.equal(calls.rows[0].skip, 2);
  assert.equal(calls.rows[0].take, 2);
});

test('foreign/missing/hidden threads return the same 404 without fetching replies', async () => {
  for (const path of [
    '/post-2/comments/root-1/replies',
    '/post-1/comments/reply-1/replies',
  ]) {
    const response = await fetch(url + '/api/v1/posts' + path);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      status: 404,
      data: null,
      message: 'Comment thread not found',
    });
  }
  threadVisible = false;
  const response = await fetch(
    url + '/api/v1/posts/post-1/comments/root-1/replies',
  );
  assert.equal(response.status, 404);
  assert.equal(calls.rows.length + calls.counts.length, 0);
});

test('existing empty posts and roots return 200 with default pagination', async () => {
  rows = [];
  total = 0;
  liveCount = 0;
  for (const suffix of ['', '/root-1/replies']) {
    const response = await fetch(
      url + '/api/v1/posts/post-1/comments' + suffix,
    );
    assert.equal(response.status, 200);
    const data = await readSuccess(response);
    assert.deepEqual(data.items, []);
    assert.deepEqual(data.pagination, {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  }
});

test('invalid path IDs, pagination and filter overrides fail before all database calls', async () => {
  for (const path of [
    '/post-1/comments?page=0',
    '/post-1/comments?page=10001',
    '/post-1/comments?limit=0',
    '/post-1/comments?limit=101',
    '/post-1/comments?limit=1.5',
    '/post-1/comments?page=1&page=2',
    '/post-1/comments?limit[x]=1',
    '/post-1/comments?postId=other',
    '/post-1/comments?deletedAt=null',
    '/post-1/comments/root-1/replies?parentId=other',
    '/post-1/comments/root-1/replies?limit=101',
    '/post-1/comments/root-1/replies?limit=1&limit=2',
    '/%20/comments',
    '/%ZZ/comments',
    '/' + 'a'.repeat(101) + '/comments',
    '/post-1/comments/%20/replies',
  ]) {
    const response = await fetch(url + '/api/v1/posts' + path);
    assert.equal(response.status, 400, path);
    const body = await response.json();
    assert.equal(body.status, 400);
    assert.equal(body.data, null);
  }
  assert.ok(Object.values(calls).every((list) => list.length === 0));
});

test('comment database errors use the safe common 500 envelope', async () => {
  failure = new Error('private database detail');
  for (const suffix of ['', '/root-1/replies']) {
    const response = await fetch(
      url + '/api/v1/posts/post-1/comments' + suffix,
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      status: 500,
      data: null,
      message: 'Internal Server Error',
    });
  }
});

test('Swagger describes pagination, IDs and both response contracts', async () => {
  const spec = await (await fetch(url + '/docs-json')).json();
  for (const suffix of ['', '/{threadId}/replies']) {
    const operation =
      spec.paths['/api/v1/posts/{postId}/comments' + suffix].get;
    assert.equal(
      operation.parameters.find((p) => p.name === 'postId').required,
      true,
    );
    if (suffix)
      assert.equal(
        operation.parameters.find((p) => p.name === 'threadId').required,
        true,
      );
    assert.equal(
      operation.parameters.find((p) => p.name === 'page').schema.default,
      1,
    );
    assert.equal(
      operation.parameters.find((p) => p.name === 'limit').schema.maximum,
      100,
    );
    const schema =
      operation.responses['200'].content['application/json'].schema;
    assert.deepEqual(schema.required, ['status', 'data']);
    for (const code of [400, 404, 500]) assert.ok(operation.responses[code]);
  }
  assert.ok(spec.components.schemas.CommentThreadDto.properties.replyCount);
  assert.equal(spec.components.schemas.CommentDto.properties.author, undefined);
});
