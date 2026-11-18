import { vi } from 'vitest';
import type { AuthIdentity, TokenVerifier } from '../src/lib/firebase.js';

/**
 * Fake token verifier for tests: the bearer token *is* the user's identity,
 * in the form "uid:email". Anything else is rejected like an invalid Firebase token.
 */
export const fakeVerifyToken: TokenVerifier = async (token) => {
  const [uid, email] = token.split(':');
  if (!uid || !email) throw new Error('invalid token');
  return { uid, email, name: null } satisfies AuthIdentity;
};

export const bearer = (uid: string, email = `${uid}@example.com`) => ({
  authorization: `Bearer ${uid}:${email}`,
});

export const OWNER = {
  id: '11111111-1111-4111-8111-111111111111',
  firebaseUid: 'owner-uid',
  email: 'owner@example.com',
  displayName: 'Owner',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const FRIEND = {
  id: '22222222-2222-4222-8222-222222222222',
  firebaseUid: 'friend-uid',
  email: 'friend@example.com',
  displayName: 'Friend',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const TASK_ID = '33333333-3333-4333-8333-333333333333';

export function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    title: 'Buy milk',
    description: null,
    status: 'todo',
    dueDate: null,
    ownerId: OWNER.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: OWNER.id, email: OWNER.email, displayName: OWNER.displayName },
    shares: [
      {
        taskId: TASK_ID,
        userId: FRIEND.id,
        sharedAt: new Date(),
        user: { id: FRIEND.id, email: FRIEND.email, displayName: FRIEND.displayName },
      },
    ],
    ...overrides,
  };
}

/** Minimal Prisma mock with only the methods the routes use. */
export function createPrismaMock() {
  const users = [OWNER, FRIEND];
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: vi.fn(async ({ where }: { where: { firebaseUid?: string } }) =>
        users.find((u) => u.firebaseUid === where.firebaseUid) ?? null,
      ),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(makeTask()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(makeTask()),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    taskShare: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}
