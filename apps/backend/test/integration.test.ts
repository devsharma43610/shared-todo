/**
 * End-to-end API flow against a real PostgreSQL database.
 * Skipped unless TEST_DATABASE_URL is set (the database must already be migrated):
 *
 *   TEST_DATABASE_URL=postgresql://todo:todo@localhost:5432/shared_todo_test npm test
 */
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createPrismaClient, type PrismaClient } from '../src/lib/prisma.js';
import { bearer, fakeVerifyToken } from './helpers.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('API integration (real database)', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  const alice = bearer('alice-uid', 'alice@example.com');
  const bob = bearer('bob-uid', 'bob@example.com');
  const carol = bearer('carol-uid', 'carol@example.com');

  beforeAll(async () => {
    prisma = createPrismaClient(url!);
    await prisma.$executeRawUnsafe('TRUNCATE task_shares, tasks, users CASCADE');
    app = buildApp({ prisma, verifyToken: fakeVerifyToken });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('runs the full signup → create → share → filter → permissions flow', async () => {
    // Signup creates users in the DB
    const aliceRes = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      headers: alice,
      payload: { displayName: 'Alice' },
    });
    expect(aliceRes.statusCode).toBe(201);
    const bobRes = await app.inject({ method: 'POST', url: '/auth/signup', headers: bob, payload: {} });
    expect(bobRes.statusCode).toBe(201);
    await app.inject({ method: 'POST', url: '/auth/login', headers: carol });

    // Logging in again doesn't create a duplicate
    const relogin = await app.inject({ method: 'POST', url: '/auth/login', headers: alice });
    expect(relogin.statusCode).toBe(200);
    expect(relogin.json().id).toBe(aliceRes.json().id);

    // Alice creates two tasks, Bob creates one
    const t1 = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: alice,
      payload: { title: 'Plan trip', description: 'Goa in December' },
    });
    expect(t1.statusCode).toBe(201);
    const task1 = t1.json();
    expect(task1).toMatchObject({ title: 'Plan trip', status: 'todo', permission: 'owner' });

    await app.inject({ method: 'POST', url: '/tasks', headers: alice, payload: { title: 'Private' } });
    await app.inject({ method: 'POST', url: '/tasks', headers: bob, payload: { title: "Bob's task" } });

    // Alice finds Bob and shares task1 with him
    const search = await app.inject({ method: 'GET', url: '/users?search=bob', headers: alice });
    expect(search.json()).toHaveLength(1);
    const bobId = search.json()[0].id;

    const share = await app.inject({
      method: 'POST',
      url: `/tasks/${task1.id}/shares`,
      headers: alice,
      payload: { userIds: [bobId] },
    });
    expect(share.statusCode).toBe(200);
    expect(share.json().sharedWith).toHaveLength(1);

    // Bob's filters
    const list = (filter: string) =>
      app.inject({ method: 'GET', url: `/tasks?filter=${filter}`, headers: bob }).then((r) => r.json());
    expect((await list('all')).map((t: { title: string }) => t.title).sort()).toEqual([
      "Bob's task",
      'Plan trip',
    ]);
    expect((await list('mine')).map((t: { title: string }) => t.title)).toEqual(["Bob's task"]);
    const shared = await list('shared');
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ title: 'Plan trip', permission: 'editor' });

    // Bob (shared user) can edit…
    const edit = await app.inject({
      method: 'PATCH',
      url: `/tasks/${task1.id}`,
      headers: bob,
      payload: { status: 'in_progress' },
    });
    expect(edit.statusCode).toBe(200);
    expect(edit.json().status).toBe('in_progress');

    // …but cannot delete or re-share
    expect(
      (await app.inject({ method: 'DELETE', url: `/tasks/${task1.id}`, headers: bob })).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/tasks/${task1.id}/shares`,
          headers: bob,
          payload: { userIds: [aliceRes.json().id] },
        })
      ).statusCode,
    ).toBe(403);

    // Carol has no access at all
    expect(
      (await app.inject({ method: 'GET', url: `/tasks/${task1.id}`, headers: carol })).statusCode,
    ).toBe(404);

    // Bob leaves the task, then Alice deletes it
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/tasks/${task1.id}/shares/${bobId}`,
          headers: bob,
        })
      ).statusCode,
    ).toBe(204);
    expect(await list('shared')).toHaveLength(0);
    expect(
      (await app.inject({ method: 'DELETE', url: `/tasks/${task1.id}`, headers: alice })).statusCode,
    ).toBe(204);
  });
});
