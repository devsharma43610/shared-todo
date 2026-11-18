# Shared To-Do List

A full-stack to-do app where users can create tasks and share them with other users.

| Layer    | Tech |
|----------|------|
| Frontend | Vue 3, Pinia, Vue Router, Vite, TypeScript |
| Backend  | Node.js, Fastify (organised as serverless functions), TypeScript |
| Database | PostgreSQL, Prisma ORM + migrations, [DBML schema](db/schema.dbml) |
| Auth     | Firebase Authentication (email + password), Firebase Auth Emulator for local dev |
| Infra    | Docker + docker-compose, npm workspaces monorepo |

## Features

- **Login / sign-up** with email (ID) + password. Firebase handles credentials, and the backend creates the user in Postgres.
- **Tasks tab** that lists the tasks you created and the tasks shared with you.
- **Filter dropdown** with All Tasks, My Tasks and Shared Tasks.
- **Share popup** to search users by name or email, share with several people at once, and see or remove who has access.
- Create, edit, complete and delete tasks, with a status (To do / In progress / Done) and an optional due date.

### Permissions

| Action                 | Owner | Shared user |
|------------------------|:-----:|:-----------:|
| View                   |  ✅   |     ✅      |
| Edit (title, status…)  |  ✅   |     ✅      |
| Delete                 |  ✅   |     ❌      |
| Share / remove people  |  ✅   |     ❌ (can only *leave* the task) |

Users with no access get `404` rather than `403`, so the API doesn't reveal which task IDs exist.

---

## Quick start (Docker)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2).

```bash
git clone <this-repo> shared-todo
cd shared-todo
docker compose up --build
```

The first build takes a few minutes. When all four containers report healthy:

| Service | URL |
|---------|-----|
| **App** | http://localhost:8080 |
| API | http://localhost:3000 (also proxied at http://localhost:8080/api) |
| Firebase Emulator UI (view and manage test users) | http://localhost:4000 |
| PostgreSQL | `localhost:5432`, user/password/db `todo` / `todo` / `shared_todo` |

**Try it:** sign up two users (e.g. `alice@example.com` and `bob@example.com`, password `secret123`). Have Alice create a task and share it with Bob, then log in as Bob and switch the filter to *Shared Tasks*.

No `.env` file and no Firebase account are needed. Every setting has a default, and the stack uses the Firebase Auth Emulator with a `demo-` project ID, so it runs fully offline. Copy `.env.example` to `.env` only if you want to change ports or credentials.

```bash
docker compose down        # stop (users, tasks and emulator accounts are kept in volumes)
docker compose down -v     # stop and wipe all data
```

---

## Local development (without Docker for the apps)

Run the database and the auth emulator in Docker, and the backend and frontend with hot reload on your machine (Node.js 20+).

```bash
# 1. Infrastructure
docker compose up -d postgres firebase

# 2. Install dependencies (also generates the Prisma client)
npm install

# 3. Environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 4. Apply migrations
npm run db:migrate

# 5. Start the API (http://localhost:3000) and the web app (http://localhost:5173)
npm run dev:backend
npm run dev:frontend      # in a second terminal
```

The Vite dev server proxies `/api/*` to the backend, the same way nginx does in Docker.

---

## Environment variables

### Backend (`apps/backend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://todo:todo@localhost:5432/shared_todo` | PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` | `demo-shared-todo` | Firebase project whose ID tokens are accepted |
| `FIREBASE_AUTH_EMULATOR_HOST` | `localhost:9099` | Set this to verify tokens from the Auth Emulator; remove it for real Firebase |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Server bind address |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:8080` | Allowed origins (comma-separated, or `*`) |
| `LOG_LEVEL` | `info` | Pino log level |
| `TEST_DATABASE_URL` | `postgresql://…/shared_todo_test` | Optional; enables the integration test |

### Frontend (`apps/frontend/.env`, inlined at build time)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | API base URL |
| `VITE_FIREBASE_API_KEY` | `demo-api-key` | Firebase web API key (any value works with the emulator) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `demo-shared-todo.firebaseapp.com` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | `demo-shared-todo` | Must match the backend's `FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_AUTH_EMULATOR_URL` | `http://localhost:9099` | Leave empty to use real Firebase |

### docker-compose (root `.env`, optional)

See [`.env.example`](.env.example). It covers the Postgres credentials, ports, Firebase project ID and CORS origins.

### Using a real Firebase project instead of the emulator

1. In the Firebase console, enable **Authentication → Sign-in method → Email/Password**.
2. Frontend: set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` and `VITE_FIREBASE_PROJECT_ID` from your web app config, and set `VITE_FIREBASE_AUTH_EMULATOR_URL` to empty.
3. Backend: set `FIREBASE_PROJECT_ID` and remove `FIREBASE_AUTH_EMULATOR_HOST`. Verifying ID tokens only needs the project ID, so no service-account key is required.

---

## Project structure

```
.
├── apps/
│   ├── backend/                 # Fastify API (TypeScript)
│   │   ├── prisma/              # schema.prisma + SQL migrations
│   │   ├── src/
│   │   │   ├── functions/       # one Fastify plugin per serverless function
│   │   │   │   ├── health.ts    #   GET  /health
│   │   │   │   ├── auth.ts      #   POST /auth/signup, POST /auth/login, GET /auth/me
│   │   │   │   ├── users.ts     #   GET  /users?search=
│   │   │   │   ├── tasks.ts     #   CRUD /tasks
│   │   │   │   └── shares.ts    #   POST/DELETE /tasks/:id/shares
│   │   │   ├── services/        # permission rules, task queries + DTOs
│   │   │   ├── plugins/auth.ts  # Firebase ID-token verification
│   │   │   ├── schemas.ts       # JSON Schemas (validation + serialization)
│   │   │   ├── app.ts           # buildApp(): wires the functions together
│   │   │   ├── server.ts        # local / Docker entry point
│   │   │   └── lambda.ts        # AWS Lambda entry points
│   │   ├── test/
│   │   ├── serverless.yml
│   │   └── Dockerfile
│   └── frontend/                # Vue 3 + Pinia + Vite
│       ├── src/
│       │   ├── views/           # LoginView, TasksView, ProfileView
│       │   ├── components/      # TaskCard, TaskEditorModal, ShareTaskModal, AppModal
│       │   ├── stores/          # Pinia: auth, tasks
│       │   └── lib/             # api client, firebase
│       ├── nginx.conf
│       └── Dockerfile
├── db/schema.dbml               # database schema (DBML)
├── docker/firebase/             # Firebase Auth Emulator image
├── docker-compose.yml
└── package.json                 # npm workspaces root
```

### How "serverless functions" work here

Each file in `apps/backend/src/functions/` is a self-contained Fastify plugin, which is one deployable function.

- **Locally and in Docker**, `server.ts` mounts all of them in one long-running Fastify server, giving a fast dev loop and one container.
- **On AWS Lambda**, `lambda.ts` exports one handler per function group (`health`, `auth`, `users`, `tasks`) using [`@fastify/aws-lambda`](https://github.com/fastify/aws-lambda-fastify). `serverless.yml` maps each one to its HTTP routes.

Both entry points use the same `buildApp()`, so the code is identical in every environment. To deploy: `npm run build -w apps/backend && npx serverless deploy`.

### Auth flow

1. The frontend signs up or logs in with the Firebase JS SDK (`createUserWithEmailAndPassword` / `signInWithEmailAndPassword`).
2. It calls `POST /auth/signup` or `POST /auth/login` with `Authorization: Bearer <Firebase ID token>`.
3. The backend verifies the token with the Firebase Admin SDK and creates or updates the user in Postgres, matched by Firebase UID, then by email.
4. Every other request sends the ID token. The `requireUser` preHandler verifies it and loads the DB user.

---

## API reference

All endpoints except `/health` need `Authorization: Bearer <Firebase ID token>`. Errors look like `{ "statusCode": 403, "error": "Forbidden", "message": "…" }`. Request bodies, params and query strings are validated with Fastify JSON Schemas (see `src/schemas.ts`).

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| GET | `/health` | public | Liveness + DB check (`200` / `503`) |
| POST | `/auth/signup` | token | Create the DB user. Body: `{ displayName? }`. `201` if created, `200` if it already existed |
| POST | `/auth/login` | token | Create or update the DB user and return it |
| GET | `/auth/me` | user | Current user |
| GET | `/users?search=&limit=` | user | Search other users by name or email (for sharing) |
| GET | `/tasks?filter=all\|mine\|shared&status=` | user | List tasks |
| POST | `/tasks` | user | Create. Body: `{ title, description?, status?, dueDate? }` |
| GET | `/tasks/:id` | owner, shared | Get one task |
| PATCH | `/tasks/:id` | owner, shared | Update any of `title`, `description`, `status`, `dueDate` |
| DELETE | `/tasks/:id` | owner | Delete (`204`) |
| POST | `/tasks/:id/shares` | owner | Share. Body: `{ userIds: string[] }`. Returns the updated task |
| DELETE | `/tasks/:id/shares/:userId` | owner, or the shared user themselves | Remove access (`204`) |

A task looks like this:

```json
{
  "id": "…", "title": "Plan trip", "description": null, "status": "todo", "dueDate": null,
  "createdAt": "…", "updatedAt": "…",
  "owner": { "id": "…", "email": "alice@example.com", "displayName": "Alice" },
  "permission": "owner",
  "sharedWith": [{ "id": "…", "email": "bob@example.com", "displayName": "Bob", "sharedAt": "…" }]
}
```

---

## Database

The schema has three tables: `users`, `tasks` (with `owner_id`) and `task_shares` (a join table with composite PK `(task_id, user_id)`). Deletes cascade.

- [`db/schema.dbml`](db/schema.dbml): paste it into [dbdiagram.io](https://dbdiagram.io) to see the ER diagram.
- [`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma): the source of truth for migrations.
- The backend container runs `prisma migrate deploy` on start.

```bash
npm run db:migrate                                  # create/apply a migration in dev
npx -w apps/backend prisma studio                   # browse the data
```

---

## Tests

```bash
npm test                     # backend + frontend
```

- **Backend** (Vitest):
  - permission-rule unit tests
  - route tests (auth, validation, permissions, health, error format) using `app.inject()` with a mocked Prisma client
  - a full-flow **integration test** against real Postgres, covering signup, create, share, the three filters, edit, the delete and share restrictions, and leaving a task
- **Frontend** (Vitest): Pinia tasks-store tests.

The integration test runs when `TEST_DATABASE_URL` points to a migrated database:

```bash
docker compose exec postgres psql -U todo -c "CREATE DATABASE shared_todo_test"
DATABASE_URL=postgresql://todo:todo@localhost:5432/shared_todo_test npx -w apps/backend prisma migrate deploy
TEST_DATABASE_URL=postgresql://todo:todo@localhost:5432/shared_todo_test npm test -w apps/backend
```

Other checks: `npm run typecheck` and `npm run build`.

---

## Troubleshooting

- **Port already in use.** Change `FRONTEND_PORT`, `BACKEND_PORT` or `POSTGRES_PORT` in a root `.env`. Ports 9099 and 4000 are fixed because the browser talks to the emulator directly.
- **"Could not reach the authentication server".** The Firebase emulator isn't running or isn't healthy yet. Check `docker compose logs firebase`.
- **"Account not registered" (403).** The Firebase user exists but `/auth/login` hasn't run yet. Logging in through the UI fixes it.
- **Start completely fresh** with `docker compose down -v`.
