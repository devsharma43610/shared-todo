import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { forbidden, unauthorized } from '../lib/errors.js';

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Adds two preHandlers:
 *  - `authenticate`: requires a valid Firebase ID token.
 *  - `requireUser`: also requires that the user has completed signup/login (exists in our DB).
 */
export const authPlugin = fp(async (app) => {
  app.decorateRequest('identity', null);
  app.decorateRequest('currentUser', null);

  async function verifyRequest(request: FastifyRequest): Promise<void> {
    const token = extractBearerToken(request);
    if (!token) {
      throw unauthorized('Missing "Authorization: Bearer <Firebase ID token>" header');
    }
    try {
      request.identity = await app.verifyToken(token);
    } catch (err) {
      request.log.debug({ err }, 'Firebase token verification failed');
      throw unauthorized('Invalid or expired token');
    }
  }

  app.decorate('authenticate', async function (request: FastifyRequest) {
    await verifyRequest(request);
  });

  app.decorate('requireUser', async function (request: FastifyRequest) {
    await verifyRequest(request);
    const user = await app.prisma.user.findUnique({
      where: { firebaseUid: request.identity!.uid },
    });
    if (!user) {
      throw forbidden('Account not registered. Call POST /auth/signup or POST /auth/login first.');
    }
    request.currentUser = user;
  });
});
