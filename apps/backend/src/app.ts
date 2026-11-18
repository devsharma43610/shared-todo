import cors from '@fastify/cors';
import { STATUS_CODES } from 'node:http';
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyPluginAsync,
  type FastifyServerOptions,
} from 'fastify';
import { authFunction } from './functions/auth.js';
import { healthFunction } from './functions/health.js';
import { sharesFunction } from './functions/shares.js';
import { tasksFunction } from './functions/tasks.js';
import { usersFunction } from './functions/users.js';
import type { TokenVerifier } from './lib/firebase.js';
import type { PrismaClient } from './lib/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { sharedSchemas } from './schemas.js';
import './types.js';

/**
 * Each "function" is a self-contained Fastify plugin. The local server mounts all of
 * them; on AWS Lambda each group is deployed as its own function (see src/lambda.ts).
 */
export const functions = {
  health: [healthFunction],
  auth: [authFunction],
  users: [usersFunction],
  tasks: [tasksFunction, sharesFunction],
} satisfies Record<string, FastifyPluginAsync[]>;

export const allFunctions = Object.values(functions).flat();

export interface AppDeps {
  prisma: PrismaClient;
  verifyToken: TokenVerifier;
  corsOrigin?: string[] | true;
  logger?: FastifyServerOptions['logger'];
}

export function buildApp(deps: AppDeps, plugins: FastifyPluginAsync[] = allFunctions): FastifyInstance {
  const app = Fastify({
    logger: deps.logger ?? false,
    ajv: { customOptions: { allErrors: false } },
  });

  app.decorate('prisma', deps.prisma);
  app.decorate('verifyToken', deps.verifyToken);

  for (const schema of sharedSchemas) {
    app.addSchema(schema);
  }

  app.register(cors, {
    origin: deps.corsOrigin ?? true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.register(authPlugin);

  app.setErrorHandler((error: FastifyError & { code?: string }, request, reply) => {
    // Prisma: record not found / unique constraint
    if (error.code === 'P2025') {
      return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Not found' });
    }
    if (error.code === 'P2002') {
      return reply
        .code(409)
        .send({ statusCode: 409, error: 'Conflict', message: 'Resource already exists' });
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled error');
    }
    return reply.code(statusCode).send({
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message: statusCode >= 500 ? 'Something went wrong' : error.message,
    });
  });

  app.register(async (scope) => {
    for (const plugin of plugins) {
      await scope.register(plugin);
    }
  });

  return app;
}
