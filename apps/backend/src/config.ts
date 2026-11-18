export interface AppConfig {
  port: number;
  host: string;
  databaseUrl: string;
  firebaseProjectId: string;
  corsOrigin: string[] | true;
  logLevel: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '0.0.0.0',
    databaseUrl: required('DATABASE_URL'),
    firebaseProjectId: required('FIREBASE_PROJECT_ID'),
    // "*" or empty = reflect any origin (fine for local dev); otherwise a comma-separated allow-list.
    corsOrigin:
      !corsOrigin || corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
