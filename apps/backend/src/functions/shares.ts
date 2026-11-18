import type { FastifyPluginAsync } from 'fastify';
import { badRequest, notFound } from '../lib/errors.js';
import { shareTaskSchema, unshareTaskSchema } from '../schemas.js';
import { canRemoveShare, canShare } from '../services/task-access.js';
import { assertAllowed, getAccessibleTask, taskInclude, toTaskDto } from '../services/tasks.js';

/** Share a task with other users / remove a share. */
export const sharesFunction: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireUser);

  // Only the owner can share. Sharing with someone who already has access is a no-op.
  app.post<{ Params: { id: string }; Body: { userIds: string[] } }>(
    '/tasks/:id/shares',
    { schema: shareTaskSchema },
    async (request) => {
      const user = request.currentUser!;
      const taskId = request.params.id;
      const { permission } = await getAccessibleTask(app.prisma, taskId, user);
      assertAllowed(canShare(permission), 'Only the task owner can share this task');

      const userIds = request.body.userIds;
      if (userIds.includes(user.id)) {
        throw badRequest('You cannot share a task with yourself');
      }

      const existing = await app.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      if (existing.length !== userIds.length) {
        const found = new Set(existing.map((u) => u.id));
        const missing = userIds.filter((id) => !found.has(id));
        throw badRequest(`Unknown user id(s): ${missing.join(', ')}`);
      }

      await app.prisma.taskShare.createMany({
        data: userIds.map((userId) => ({ taskId, userId })),
        skipDuplicates: true,
      });

      const task = await app.prisma.task.findUniqueOrThrow({
        where: { id: taskId },
        include: taskInclude,
      });
      return toTaskDto(task, user.id);
    },
  );

  // Owner can remove anyone; a shared user can remove themselves (leave the task).
  app.delete<{ Params: { id: string; userId: string } }>(
    '/tasks/:id/shares/:userId',
    { schema: unshareTaskSchema },
    async (request, reply) => {
      const user = request.currentUser!;
      const { id: taskId, userId } = request.params;
      const { permission } = await getAccessibleTask(app.prisma, taskId, user);
      assertAllowed(
        canRemoveShare(permission, user.id, userId),
        'Only the task owner can remove other people from this task',
      );

      const { count } = await app.prisma.taskShare.deleteMany({ where: { taskId, userId } });
      if (count === 0) {
        throw notFound('This task is not shared with that user');
      }
      return reply.code(204).send();
    },
  );
};
