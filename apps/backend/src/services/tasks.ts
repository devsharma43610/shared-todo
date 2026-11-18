import type { Prisma, User } from '../generated/prisma/client.js';
import { forbidden, notFound } from '../lib/errors.js';
import type { PrismaClient } from '../lib/prisma.js';
import { getPermission, type TaskPermission } from './task-access.js';

export type TaskFilter = 'all' | 'mine' | 'shared';

const userSummarySelect = { id: true, email: true, displayName: true } as const;

export const taskInclude = {
  owner: { select: userSummarySelect },
  shares: {
    include: { user: { select: userSummarySelect } },
    orderBy: { sharedAt: 'asc' },
  },
} as const satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function buildTaskFilter(filter: TaskFilter, userId: string): Prisma.TaskWhereInput {
  const mine: Prisma.TaskWhereInput = { ownerId: userId };
  const shared: Prisma.TaskWhereInput = { shares: { some: { userId } } };
  switch (filter) {
    case 'mine':
      return mine;
    case 'shared':
      return shared;
    default:
      return { OR: [mine, shared] };
  }
}

/** Shape returned by the API for a single task. */
export function toTaskDto(task: TaskWithRelations, currentUserId: string) {
  const permission = getPermission(task, currentUserId) as TaskPermission;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    owner: task.owner,
    permission,
    sharedWith: task.shares.map((share) => ({ ...share.user, sharedAt: share.sharedAt })),
  };
}

/**
 * Loads a task the user is allowed to see. Returns 404 (not 403) when the user has no
 * access at all, so we don't leak which task IDs exist.
 */
export async function getAccessibleTask(
  prisma: PrismaClient,
  taskId: string,
  user: User,
): Promise<{ task: TaskWithRelations; permission: TaskPermission }> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
  const permission = task ? getPermission(task, user.id) : null;
  if (!task || !permission) {
    throw notFound('Task not found');
  }
  return { task, permission };
}

export function assertAllowed(allowed: boolean, message: string): void {
  if (!allowed) throw forbidden(message);
}
