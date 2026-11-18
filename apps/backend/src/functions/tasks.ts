import type { FastifyPluginAsync } from 'fastify';
import type { TaskStatus } from '../generated/prisma/client.js';
import {
  createTaskSchema,
  deleteTaskSchema,
  getTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from '../schemas.js';
import { canDelete, canEdit } from '../services/task-access.js';
import {
  assertAllowed,
  buildTaskFilter,
  getAccessibleTask,
  taskInclude,
  toTaskDto,
  type TaskFilter,
} from '../services/tasks.js';

interface TaskBody {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
}

interface IdParams {
  id: string;
}

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

/** CRUD for tasks. */
export const tasksFunction: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireUser);

  // List tasks owned by and/or shared with the current user.
  app.get<{ Querystring: { filter: TaskFilter; status?: TaskStatus } }>(
    '/tasks',
    { schema: listTasksSchema },
    async (request) => {
      const user = request.currentUser!;
      const { filter, status } = request.query;
      const tasks = await app.prisma.task.findMany({
        where: { ...buildTaskFilter(filter, user.id), ...(status ? { status } : {}) },
        include: taskInclude,
        orderBy: [{ updatedAt: 'desc' }],
      });
      return tasks.map((task) => toTaskDto(task, user.id));
    },
  );

  app.post<{ Body: TaskBody & { title: string } }>(
    '/tasks',
    { schema: createTaskSchema },
    async (request, reply) => {
      const user = request.currentUser!;
      const { title, description, status, dueDate } = request.body;
      const task = await app.prisma.task.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          status,
          dueDate: toDate(dueDate),
          ownerId: user.id,
        },
        include: taskInclude,
      });
      return reply.code(201).send(toTaskDto(task, user.id));
    },
  );

  app.get<{ Params: IdParams }>('/tasks/:id', { schema: getTaskSchema }, async (request) => {
    const user = request.currentUser!;
    const { task } = await getAccessibleTask(app.prisma, request.params.id, user);
    return toTaskDto(task, user.id);
  });

  // Owner and shared users can edit.
  app.patch<{ Params: IdParams; Body: TaskBody }>(
    '/tasks/:id',
    { schema: updateTaskSchema },
    async (request) => {
      const user = request.currentUser!;
      const { permission } = await getAccessibleTask(app.prisma, request.params.id, user);
      assertAllowed(canEdit(permission), 'You cannot edit this task');

      const { title, description, status, dueDate } = request.body;
      const task = await app.prisma.task.update({
        where: { id: request.params.id },
        data: {
          title: title?.trim(),
          description: description === undefined ? undefined : description?.trim() || null,
          status,
          dueDate: toDate(dueDate),
        },
        include: taskInclude,
      });
      return toTaskDto(task, user.id);
    },
  );

  // Only the owner can delete.
  app.delete<{ Params: IdParams }>(
    '/tasks/:id',
    { schema: deleteTaskSchema },
    async (request, reply) => {
      const user = request.currentUser!;
      const { permission } = await getAccessibleTask(app.prisma, request.params.id, user);
      assertAllowed(canDelete(permission), 'Only the task owner can delete this task');

      await app.prisma.task.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    },
  );
};
