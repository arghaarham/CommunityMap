# AGENTS.md

## Quick Start

```bash
npm install          # installs root + backend + frontend (postinstall hook)
npm run stack:up     # starts all three services (Docker required)
```

Or run services separately:
```bash
npm run db:up        # PostgreSQL on port 5433
npm run dev -w backend
npm run dev -w frontend
```

Clean stuck ports and Next.js cache: `npm run dev:clean`

## Architecture

- **Monorepo**: root `package.json` uses npm workspaces (`backend`, `frontend`)
- **Frontend** (`frontend/`): Next.js 15 App Router, TypeScript, TailwindCSS v4, MapLibre GL
- **Backend** (`backend/`): Express.js, CommonJS (`require`), plain JS — no TypeScript
- **Database**: PostgreSQL 16 via Docker (`infra/docker-compose.yml`), port 5433 mapped to container 5432. Falls back to `pg-mem` in-memory if Postgres unavailable.

## Key Non-Obvious Facts

- **Backend auto-migrates on startup, but demo seeding is mode-based**: `initializeDatabase()` in `backend/src/lib/bootstrap.js` always runs schema DDL. Demo seed mode defaults to `sync` in development and `off` in production, with manual refresh available via `npm run seed:demo` or `npm run seed:demo:sync`.
- **Frontend proxies API via Next.js rewrites**: `/api/*` requests from the browser are rewritten to `http://127.0.0.1:4000/api/*` (configurable via `INTERNAL_API_URL`). Server-side RSC fetches hit the backend directly.
- **Lint is frontend-only**: `npm run lint` at root runs `eslint .` inside `frontend/`. Backend has no lint script wired up.
- **No test suite**: There is no test runner configured. Backend has ad-hoc `test-*.js` files that can be run individually with `node`.
- **No CI, no pre-commit hooks**: Quality checks are manual.
- **Port 4000 (backend), 3000 (frontend), 5433 (postgres)**: `dev:clean` kills all three plus port 3001.
- **S3 uploads are opt-in**: When `AWS_S3_BUCKET` is set, file uploads go to S3. Otherwise, files are stored locally in `backend/uploads/` and served via `express.static`. No AWS credentials needed for local dev.
- **Realtime via Supabase is opt-in**: When Supabase env vars are set, the backend broadcasts status/comment/chat events via Supabase Realtime, and the frontend subscribes for live UI updates. Without the vars, everything works with manual refresh.

## Environment

Copy `.env.example` to `.env` at root. Key variables:

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_PORT` | `4000` | |
| `FRONTEND_PORT` | `3000` | |
| `DATABASE_URL` | `postgres://communitymap:communitymap@localhost:5432/communitymap` | Docker maps host 5433 |
| `JWT_SECRET` | `change-me` | |
| `INTERNAL_API_URL` | `http://127.0.0.1:4000` | For Next.js server-side API calls |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | Client-side; `/api` uses Next.js rewrites |
| `AWS_REGION` | `ap-southeast-3` | |
| `AWS_S3_BUCKET` | (empty) | When set, uploads go to S3 instead of local disk |
| `AWS_ACCESS_KEY_ID` | (empty) | Optional if using IAM instance roles |
| `AWS_SECRET_ACCESS_KEY` | (empty) | Optional if using IAM instance roles |
| `NEXT_PUBLIC_SUPABASE_URL` | (empty) | Supabase project URL for realtime |
| `NEXT_PUBLIC_SUPABASE_KEY` | (empty) | Supabase publishable key (`sb_publishable_xxx`) or legacy anon key |
| `SUPABASE_SECRET_KEY` | (empty) | Supabase secret key (`sb_secret_xxx`) or legacy service_role key |

Backend loads `.env` from both `backend/` and root (`../`).

## Backend Module Structure

Each domain module in `backend/src/modules/<name>/` follows a flat pattern:
- `<name>.routes.js` — Express router
- `<name>.service.js` — business logic

Modules: `auth`, `reports`, `admin`, `uploads`, `chats`, `users`

API routes are mounted in `backend/src/app.js`:
- `/api/auth` — login, register, logout, profile
- `/api/reports` — CRUD, upvote/downvote, comments
- `/api/admin` — verify, status updates, CSV export
- `/api/uploads` — file upload (multer)
- `/api/chats` — real-time chat per report
- `/api/users` — public profiles

## Frontend Structure

- `src/app/` — Next.js App Router pages (each folder is a route)
- `src/components/` — shared UI organized by domain: `auth/`, `dashboard/`, `landing/`, `layout/`, `map/`, `profile/`, `report/`, `ui/`
- `src/lib/api/` — API layer split into `client.ts` (browser), `server.ts` (RSC), `base.ts` (shared)
- `src/types/community-map.ts` — shared TypeScript types
- Path alias: `@/` maps to `src/`

## Conventions

- **Language**: UI strings, comments, and docs are in Indonesian (Bahasa Indonesia).
- **Auth**: JWT stored in httpOnly cookie (`communitymap_token`). Credentials sent via `credentials: "include"` on client fetches.
- **API response shape**: `{ data: T }` for success, `{ error: { message, code, details, requestId } }` for errors.
- **Report statuses**: `new → verified → in_progress → resolved` (also `rejected` for admin rejection).
- **Demo accounts**: `warga@email.com` / `password` (citizen), `admin@dpu.go.id` / `password` (admin).
