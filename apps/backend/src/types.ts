import type { preHandlerAsyncHookHandler } from 'fastify';
import type { User } from './generated/prisma/client.js';
import type { AuthIdentity, TokenVerifier } from './lib/firebase.js';
import type { PrismaClient } from './lib/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    verifyToken: TokenVerifier;
    /** Verifies the Firebase ID token and sets `request.identity`. */
    authenticate: preHandlerAsyncHookHandler;
    /** Like `authenticate`, but also loads the DB user into `request.currentUser`. */
    requireUser: preHandlerAsyncHookHandler;
  }

  interface FastifyRequest {
    identity: AuthIdentity | null;
    currentUser: User | null;
  }
}

export {};
