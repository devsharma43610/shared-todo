import type { FastifyPluginAsync } from 'fastify';
import { healthSchema } from '../schemas.js';

/** GET /health — liveness + database connectivity check (used by Docker healthchecks). */
export const healthFunction: FastifyPluginAsync = async (app) => {
  // logLevel 'warn' keeps Docker's frequent healthchecks out of the logs.
  app.get('/health', { schema: healthSchema, logLevel: 'warn' }, async (request, reply) => {
    const uptimeSeconds = Math.round(process.uptime());
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', uptimeSeconds };
    } catch (err) {
      request.log.error({ err }, 'Health check: database unreachable');
      return reply.code(503).send({ status: 'degraded', database: 'down', uptimeSeconds });
    }
  });
};
