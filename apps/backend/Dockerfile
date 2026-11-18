# Backend image. Build from the repo root (monorepo):
#   docker build -f apps/backend/Dockerfile .

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN npm ci -w apps/backend --include-workspace-root --ignore-scripts

COPY apps/backend apps/backend
RUN npm run prisma:generate -w apps/backend \
  && npm run build -w apps/backend

# ---------- runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
# Production deps only (prisma CLI is a runtime dep so migrations can run on start).
RUN npm ci -w apps/backend --omit=dev --ignore-scripts && npm cache clean --force

WORKDIR /app/apps/backend
COPY apps/backend/prisma ./prisma
COPY apps/backend/prisma.config.ts ./
COPY apps/backend/docker-entrypoint.sh ./
COPY --from=build /app/apps/backend/dist ./dist

RUN chmod +x docker-entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
