import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createFirebaseTokenVerifier } from './lib/firebase.js';
import { createPrismaClient } from './lib/prisma.js';

/** Local / Docker entry point: one long-running Fastify server with every function mounted. */
async function main() {
  const config = loadConfig();
  const prisma = createPrismaClient(config.databaseUrl);

  const app = buildApp({
    prisma,
    verifyToken: createFirebaseTokenVerifier(config.firebaseProjectId),
    corsOrigin: config.corsOrigin,
    logger: { level: config.logLevel },
  });

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    app.log.info(`Using Firebase Auth Emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  }

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
