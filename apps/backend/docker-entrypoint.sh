#!/bin/sh
# Apply pending Prisma migrations, then start the API server.
set -e

echo "Running database migrations…"
npx prisma migrate deploy

echo "Starting API server…"
exec node dist/server.js
