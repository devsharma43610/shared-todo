Design Decisions

Here are the three main decisions I made while building this project and the reasons behind them.

1. How I handled "serverless functions"

The assignment asked for the backend to be written as serverless functions, but it also asked for everything to run in Docker. These two don't fit together easily, because serverless functions normally run on something like AWS Lambda, not as a regular container.

I thought about a few ways to do this:

Run each function in its own container. This felt too heavy for local development.
Use Serverless Framework with serverless-offline inside Docker. It works, but it adds another tool to the setup and makes debugging slower.
Write each function as a separate Fastify plugin. Locally I load all of them into one Fastify server, and for Lambda I export each one as its own handler.

I went with the third option. The functions are in apps/backend/src/functions/ (health, auth, users, tasks, shares). server.ts loads all of them for Docker, and lambda.ts exports a separate handler for each group, which serverless.yml uses.

The main reason is that the same code runs in both places, so there's no separate local version that can behave differently from production. It also keeps local setup to a single docker compose up, and testing is easy because I can call the app directly with app.inject().

The downside is that locally I don't see Lambda-specific things like cold starts or timeouts. If this went to production, I'd also add a connection pooler like RDS Proxy, because many Lambdas running at once can open too many Postgres connections.

2. What shared users are allowed to do

The assignment says tasks can be shared, but it doesn't say what the other person can do with a shared task. I had to decide this myself.

If shared users could only view, sharing wouldn't be very useful. They couldn't even mark a task as done. If they could do everything, one person could delete a task for everyone or share it with people the owner never approved.

So I went somewhere in between. The owner can view, edit, delete and share a task. A shared user can view and edit it, but can't delete it or share it with anyone else. I also added a "Leave" option so a shared user can remove a task from their own list.

All these checks are in one file, services/task-access.ts, so if the rules change later I only need to update that file. The API returns a permission field with each task so the frontend can hide buttons the user can't use, but the backend still checks every request.

One small thing: if someone tries to open a task they don't have access to, they get a 404 instead of a 403. That way the API doesn't confirm that the task exists.

If I had more time, I'd add view-only sharing as an option. It would just need a role column on the task_shares table.

3. Using the Firebase Auth Emulator

The assignment requires Firebase for login. Using a real Firebase project would mean the reviewer has to create their own project and add API keys, or I'd have to share my keys, which isn't a good idea.

Instead, I used the Firebase Auth Emulator and added it to docker-compose. It uses the same Firebase SDK as the real service, but runs locally and needs no keys. I used the project ID demo-shared-todo, because Firebase treats projects starting with "demo-" as offline-only.

This way the whole app runs with one command and no setup. Switching to a real Firebase project later only needs environment variable changes, not code changes. The README explains how.

I also store users in Postgres. Firebase handles passwords and login, but I still need a users table to link tasks to people and to search users when sharing. After someone logs in with Firebase, the frontend calls /auth/signup or /auth/login, and the backend verifies the token and creates or updates the user in the database.

One problem I ran into: the emulator lost all users whenever the containers restarted, while the database still had them. I fixed this by saving the emulator data to a Docker volume on shutdown and loading it again on startup.

What I'd add with more time
View-only sharing
Pagination for long task lists
Live updates when someone else changes a shared task
A GitHub Actions pipeline to run tests and builds
An actual AWS deployment using the existing serverless.yml