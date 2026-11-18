import type { FastifyPluginAsync } from 'fastify';
import { searchUsersSchema } from '../schemas.js';

/** GET /users?search= — find other users to share a task with. */
export const usersFunction: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { search: string; limit: number } }>(
    '/users',
    { schema: searchUsersSchema, preHandler: app.requireUser },
    async (request) => {
      const { search, limit } = request.query;
      const term = search.trim();
      return app.prisma.user.findMany({
        where: {
          id: { not: request.currentUser!.id },
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { displayName: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, displayName: true },
        orderBy: { email: 'asc' },
        take: limit,
      });
    },
  );
};
