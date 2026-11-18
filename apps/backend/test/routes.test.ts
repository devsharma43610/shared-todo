import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { PrismaClient } from '../src/lib/prisma.js';
import {
  bearer,
  createPrismaMock,
  fakeVerifyToken,
  FRIEND,
  OWNER,
  TASK_ID,
  makeTask,
} from './helpers.js';

let app: FastifyInstance;
let prisma: ReturnType<typeof createPrismaMock>;

beforeEach(async () => {
  prisma = createPrismaMock();
  app = buildApp({ prisma: prisma as unknown as PrismaClient, verifyToken: fakeVerifyToken });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns ok when the database responds', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ status: 'degraded', database: 'down' });
  });
});

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { authorization: 'Bearer garbage' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('requires signup/login before using the API', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks', headers: bearer('new-uid') });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/not registered/i);
  });
});

describe('input validation', () => {
  it('rejects a task without a title', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: bearer(OWNER.firebaseUid, OWNER.email),
      payload: { title: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tasks?filter=everything',
      headers: bearer(OWNER.firebaseUid, OWNER.email),
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-uuid task id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tasks/not-a-uuid',
      headers: bearer(OWNER.firebaseUid, OWNER.email),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('task permissions', () => {
  it('returns 404 for a task the user has no access to', async () => {
    prisma.task.findUnique.mockResolvedValueOnce(makeTask({ shares: [] }));
    const res = await app.inject({
      method: 'GET',
      url: `/tasks/${TASK_ID}`,
      headers: bearer(FRIEND.firebaseUid, FRIEND.email),
    });
    expect(res.statusCode).toBe(404);
  });

  it('lets a shared user edit', async () => {
    prisma.task.update.mockResolvedValueOnce(makeTask({ status: 'done' }));
    const res = await app.inject({
      method: 'PATCH',
      url: `/tasks/${TASK_ID}`,
      headers: bearer(FRIEND.firebaseUid, FRIEND.email),
      payload: { status: 'done' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'done', permission: 'editor' });
  });

  it('does not let a shared user delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/tasks/${TASK_ID}`,
      headers: bearer(FRIEND.firebaseUid, FRIEND.email),
    });
    expect(res.statusCode).toBe(403);
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });

  it('lets the owner delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/tasks/${TASK_ID}`,
      headers: bearer(OWNER.firebaseUid, OWNER.email),
    });
    expect(res.statusCode).toBe(204);
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: TASK_ID } });
  });

  it('does not let a shared user re-share', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tasks/${TASK_ID}/shares`,
      headers: bearer(FRIEND.firebaseUid, FRIEND.email),
      payload: { userIds: [OWNER.id] },
    });
    expect(res.statusCode).toBe(403);
    expect(prisma.taskShare.createMany).not.toHaveBeenCalled();
  });

  it('does not let the owner share with themselves', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tasks/${TASK_ID}/shares`,
      headers: bearer(OWNER.firebaseUid, OWNER.email),
      payload: { userIds: [OWNER.id] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('error format', () => {
  it('uses the HTTP status name in the error field', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks' });
    expect(res.json()).toMatchObject({ statusCode: 401, error: 'Unauthorized' });
  });
});
