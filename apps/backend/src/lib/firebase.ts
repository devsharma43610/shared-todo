import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** The identity we trust after a Firebase ID token has been verified. */
export interface AuthIdentity {
  uid: string;
  email: string | null;
  name: string | null;
}

export type TokenVerifier = (idToken: string) => Promise<AuthIdentity>;

/**
 * Creates a verifier backed by the Firebase Admin SDK.
 *
 * When FIREBASE_AUTH_EMULATOR_HOST is set (e.g. "firebase:9099" in docker-compose),
 * the Admin SDK automatically verifies tokens issued by the Auth Emulator instead
 * of Google's production servers, so no service-account credentials are needed.
 */
export function createFirebaseTokenVerifier(projectId: string): TokenVerifier {
  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);

  return async (idToken) => {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: typeof decoded.name === 'string' ? decoded.name : null,
    };
  };
}
