import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createTestApp, readSuccess } from './helpers.mjs';

const databaseUrl = process.env.BACKEND_TEST_DATABASE_URL;

test('comments against PostgreSQL', { skip: !databaseUrl }, async (t) => {
  const target = new URL(databaseUrl);
  assert.ok(
    ['localhost', '127.0.0.1'].includes(target.hostname),
    'Integration tests require a local test database',
  );
  assert.equal(
    target.pathname,
    '/backtick_test',
    'Integration tests require the backtick_test database',
  );
  const { PrismaClient } = await import('../generated/client/index.js');
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const prefix = 'qa-' + randomUUID().slice(0, 8);
  const id = (name) => `${prefix}-${name}`;
  let app;
  t.after(async () => {
    try {
      await app?.close();
      // Delete only this test's users; their posts/comments cascade away.
      await prisma.user.deleteMany({
        where: { id: { in: [id('author'), id('anonymous')] } },
      });
    } finally {
      await prisma.$disconnect();
    }
  });
  await prisma.user.createMany({
    data: [
      {
        id: id('author'),
        handle: prefix,
        name: null,
        email: 'private@example.com',
        passwordHash: 'private-hash',
      },
      { id: id('anonymous'), handle: null, name: null },
    ],
  });
  await prisma.post.createMany({
    data: [
      {
        id: id('public'),
        authorId: id('author'),
        slug: 'public',
        title: 'Public',
        content: '',
        status: 'PUBLISHED',
      },
      {
        id: id('other'),
        authorId: id('author'),
        slug: 'other',
        title: 'Other',
        content: '',
        status: 'PUBLISHED',
      },
      {
        id: id('draft'),
        authorId: id('author'),
        slug: 'draft',
        title: 'Draft',
        content: '',
        status: 'DRAFT',
      },
      {
        id: id('no-handle'),
        authorId: id('anonymous'),
        slug: 'no-handle',
        title: 'No handle',
        content: '',
        status: 'PUBLISHED',
      },
    ],
  });
  const createdAt = new Date('2026-09-01T00:00:00Z');
  const deletedAt = new Date('2026-09-02T00:00:00Z');
  const row = (name, overrides = {}) => ({
    id: id(name),
    postId: id('public'),
    authorId: id('author'),
    content: name,
    createdAt,
    ...overrides,
  });
  await prisma.comment.createMany({
    data: [
      row('root-a'),
      row('root-b', { deletedAt, content: 'deleted-root-secret' }),
      row('root-c', { deletedAt }),
      row('root-d', { deletedAt }),
      row('root-e'),
      row('root-f'),
      row('root-other', { postId: id('other') }),
      row('root-draft', { postId: id('draft') }),
      row('root-no-handle', { postId: id('no-handle') }),
    ],
  });
  await prisma.comment.createMany({
    data: [
      row('reply-1', { parentId: id('root-b') }),
      row('reply-2', {
        parentId: id('root-b'),
        deletedAt,
        content: 'deleted-reply-secret',
      }),
      row('reply-3', {
        parentId: id('root-b'),
        replyToName: 'Someone',
        authorId: id('anonymous'),
      }),
      row('reply-4', { parentId: id('root-a') }),
      row('foreign-child', { postId: id('other'), parentId: id('root-d') }),
      row('wrong-parent', { parentId: id('root-other') }),
    ],
  });
  await prisma.comment.create({
    data: row('too-deep', { parentId: id('reply-1') }),
  });
  const running = await createTestApp(prisma);
  app = running.app;
  const url = running.url + `/api/v1/posts/${id('public')}/comments`;

  await t.test(
    'thread visibility, count and stable pagination execute against real relations',
    async () => {
      const first = await readSuccess(await fetch(url + '?limit=2'));
      assert.deepEqual(
        first.items.map((c) => c.id),
        [id('root-a'), id('root-b')],
      );
      assert.deepEqual(first.pagination, {
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
      assert.equal(first.commentCount, 6);
      assert.equal(first.items[0].replyCount, 1);
      assert.equal(first.items[1].replyCount, 3);
      assert.equal(first.items[1].content, '');
      assert.equal(first.items[0].authorName, prefix);
      assert.equal(JSON.stringify(first).includes('private'), false);
      const second = await readSuccess(await fetch(url + '?page=2&limit=2'));
      assert.deepEqual(
        second.items.map((c) => c.id),
        [id('root-e'), id('root-f')],
      );
    },
  );
  await t.test(
    'reply pages keep deleted placeholders and reply targets without leaking their bodies',
    async () => {
      const path = url + `/${id('root-b')}/replies`;
      const first = await readSuccess(await fetch(path + '?limit=2'));
      assert.deepEqual(
        first.items.map((c) => c.id),
        [id('reply-1'), id('reply-2')],
      );
      assert.deepEqual(first.pagination, {
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      assert.equal(first.items[1].deleted, true);
      assert.equal(first.items[1].content, '');
      const second = await readSuccess(await fetch(path + '?page=2&limit=2'));
      assert.equal(second.items[0].replyToName, 'Someone');
      assert.equal(second.items[0].authorName, '익명');
    },
  );
  await t.test(
    'draft and handle-less post comments are not public',
    async () => {
      for (const post of ['draft', 'no-handle', 'missing']) {
        for (const suffix of ['', `/${id('root-' + post)}/replies`]) {
          const response = await fetch(
            running.url + `/api/v1/posts/${id(post)}/comments` + suffix,
          );
          assert.equal(response.status, 404);
          assert.equal((await response.json()).data, null);
        }
      }
    },
  );
  await t.test(
    'cross-post, hidden and non-root thread IDs cannot retrieve replies',
    async () => {
      for (const thread of [
        'root-other',
        'root-c',
        'root-d',
        'reply-1',
        'missing',
      ]) {
        const response = await fetch(url + `/${id(thread)}/replies`);
        assert.equal(response.status, 404, thread);
      }
    },
  );
  await t.test(
    'a live root without replies and an out-of-range page return empty 200 results',
    async () => {
      for (const path of [
        url + `/${id('root-e')}/replies`,
        url + '?page=3&limit=2',
      ]) {
        const response = await fetch(path);
        assert.equal(response.status, 200);
        assert.deepEqual((await readSuccess(response)).items, []);
      }
    },
  );
});
