# Frontend image. Build from the repo root (monorepo):
#   docker build -f apps/frontend/Dockerfile .

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
RUN npm ci -w apps/frontend --ignore-scripts

COPY apps/frontend apps/frontend

# Vite inlines VITE_* variables at build time.
ARG VITE_API_BASE_URL=/api
ARG VITE_FIREBASE_API_KEY=demo-api-key
ARG VITE_FIREBASE_AUTH_DOMAIN=demo-shared-todo.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=demo-shared-todo
ARG VITE_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_AUTH_EMULATOR_URL=$VITE_FIREBASE_AUTH_EMULATOR_URL

RUN npm run build -w apps/frontend

# ---------- runtime ----------
FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
