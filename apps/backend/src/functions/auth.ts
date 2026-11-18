import type { FastifyPluginAsync } from 'fastify';
import type { User } from '../generated/prisma/client.js';
import { badRequest } from '../lib/errors.js';
import type { AuthIdentity } from '../lib/firebase.js';
import type { PrismaClient } from '../lib/prisma.js';
import { loginSchema, meSchema, signupSchema } from '../schemas.js';

const toUserDto = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

/**
 * Creates or updates the DB user that matches a verified Firebase identity.
 *
 * Users are matched by Firebase UID first, then by email. Matching by email
 * re-links an existing row if the Firebase account was recreated (for example,
 * after the Auth Emulator's data was reset while Postgres kept its data).
 */
async function syncUser(
  prisma: PrismaClient,
  identity: AuthIdentity,
  displayName?: string,
): Promise<{ user: User; created: boolean }> {
  if (!identity.email) {
    throw badRequest('Your Firebase account must have an email address');
  }
  const email = identity.email.toLowerCase();
  const name = displayName ?? identity.name ?? undefined;

  const byUid = await prisma.user.findUnique({ where: { firebaseUid: identity.uid } });
  if (byUid) {
    const user = await prisma.user.update({
      where: { id: byUid.id },
      data: { email, ...(displayName ? { displayName } : {}) },
    });
    return { user, created: false };
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { firebaseUid: identity.uid, ...(displayName ? { displayName } : {}) },
    });
    return { user, created: false };
  }

  const user = await prisma.user.create({
    data: { firebaseUid: identity.uid, email, displayName: name ?? email.split('@')[0] },
  });
  return { user, created: true };
}

/**
 * Login/signup flow:
 *  1. The frontend signs the user up / in with Firebase (email + password).
 *  2. It sends the Firebase ID token to one of these endpoints.
 *  3. The backend verifies the token and creates/updates the user in Postgres.
 */
export const authFunction: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { displayName?: string } }>(
    '/auth/signup',
    { schema: signupSchema, preHandler: app.authenticate },
    async (request, reply) => {
      const { user, created } = await syncUser(
        app.prisma,
        request.identity!,
        request.body?.displayName?.trim(),
      );
      return reply.code(created ? 201 : 200).send(toUserDto(user));
    },
  );

  app.post('/auth/login', { schema: loginSchema, preHandler: app.authenticate }, async (request) => {
    const { user } = await syncUser(app.prisma, request.identity!);
    return toUserDto(user);
  });

  app.get('/auth/me', { schema: meSchema, preHandler: app.requireUser }, async (request) =>
    toUserDto(request.currentUser!),
  );
};
