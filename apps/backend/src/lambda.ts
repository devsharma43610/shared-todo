import awsLambdaFastify from '@fastify/aws-lambda';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { buildApp, functions } from './app.js';
import { loadConfig } from './config.js';
import { createFirebaseTokenVerifier } from './lib/firebase.js';
import { createPrismaClient, type PrismaClient } from './lib/prisma.js';

/**
 * AWS Lambda entry points — one handler per function group (see serverless.yml).
 * The same Fastify plugins that the local server mounts are reused here, so the
 * code path is identical locally (Docker) and in the cloud.
 *
 * Clients are created lazily and cached across warm invocations.
 */
let prisma: PrismaClient | undefined;

function createHandler(group: keyof typeof functions) {
  let proxy: awsLambdaFastify.PromiseHandler<APIGatewayProxyEventV2> | undefined;

  return async (event: APIGatewayProxyEventV2, context: Context) => {
    if (!proxy) {
      const config = loadConfig();
      prisma ??= createPrismaClient(config.databaseUrl);
      const app = buildApp(
        {
          prisma,
          verifyToken: createFirebaseTokenVerifier(config.firebaseProjectId),
          corsOrigin: config.corsOrigin,
          logger: { level: config.logLevel },
        },
        functions[group],
      );
      proxy = awsLambdaFastify<APIGatewayProxyEventV2>(app);
      await app.ready();
    }
    return proxy(event, context);
  };
}

export const health = createHandler('health');
export const auth = createHandler('auth');
export const users = createHandler('users');
export const tasks = createHandler('tasks');
