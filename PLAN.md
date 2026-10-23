# Supabase Port Plan

Port Musician Practice Suite from Express + Prisma + self-hosted Postgres to
Supabase (Postgres, Auth, Edge Functions) with the frontend on Cloudflare Pages.

## Target architecture

| Concern | Before | After |
|---|---|---|
| Database | Postgres in Docker, Prisma migrations | Supabase Postgres, SQL migrations in `supabase/migrations/` |
| Auth | Dev-only JWT route | Supabase Auth with GitHub OAuth |
| CRUD (reeds, practice, sight-reading log) | Express controllers | `supabase-js` from the browser, enforced by row-level security (RLS) |
| Reed usage minutes | Two separate Prisma calls in the controller | Postgres trigger on `practice_sessions` |
| Practice summary and streak | Express, server time zone | Computed in the browser, user's local time zone |
| Melody generation | Express | Plain JS module in the frontend |
| AI insights | Express + in-memory cache | Edge Function `insights` + `insights_cache` table |
| Frontend hosting | Vite dev server | Cloudflare Pages |
| Local dev | Docker Compose | `supabase start` on Podman + `vite` |

Design rule: the `frontend/src/api/*.js` modules keep their current function
names and response shapes (camelCase), so the pages barely change. Snake_case
column names stay inside the API layer.

## Phase 0: Repo setup ✅
- New repo `chryzmo/musicpracticesuite-supabase` with history carried over.
- This plan committed.

## Phase 1: Supabase scaffold and schema ✅
- Root `package.json` with pinned dev tools: `supabase` CLI, `wrangler`.
- `supabase init`; adjust `supabase/config.toml` (site URL, redirect URLs,
  GitHub provider reading secrets from env, analytics off for Podman).
- Migration `..._init.sql`:
  - `profiles` (`id uuid pk references auth.users on delete cascade`,
    `email`, `display_name`, `instrument`, `created_at`), filled by an
    `on auth.users insert` trigger from OAuth metadata.
  - `reeds`, `practice_sessions`, `sight_reading_sessions`: same fields as
    today in snake_case, `uuid` ids with `gen_random_uuid()`, `timestamptz` dates,
    `user_id uuid not null default auth.uid() references profiles on delete cascade`.
  - `insights_cache` (`user_id pk`, `data jsonb`, `expires_at timestamptz`).
  - Indexes on `(user_id, date desc)` / `(user_id, open_date desc)`.
- RLS on every table: `user_id = (select auth.uid())` for select/insert/update/delete.
  `practice_sessions` insert/update also requires `reed_id` to be null or one
  of the user's own reeds.
- Trigger on `practice_sessions` insert/update/delete adjusts
  `reeds.usage_minutes` (handles reed changes and duration edits).

## Phase 2: Auth ✅
- `frontend/src/lib/supabase.js` client from `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `AuthContext` wraps `supabase.auth` session (`getSession` +
  `onAuthStateChange`); exposes `session`, `user`, `signIn(provider)`, `logout`.
- `Login` page with "Continue with GitHub". Google sign-in was dropped.
  (`signInWithOAuth`, redirect back to the app).
- Manual setup (documented in README):
  - GitHub OAuth apps (one per environment), callback
    `https://<project-ref>.supabase.co/auth/v1/callback` (and
    `http://127.0.0.1:54321/auth/v1/callback` for local).
  - Enable GitHub in the Supabase dashboard; add the Pages URL to
    Auth redirect URLs.

## Phase 3: Frontend data layer ✅
- Replace axios in `api/practice.js`, `api/reeds.js`, `api/sightReading.js`
  with `supabase-js` queries plus a small camelCase/snake_case mapper.
  - `practice.list` → `.range()` with `count: 'exact'`, embeds `reed(identifier, reed_type)`.
  - `practice.summary` → fetch the user's sessions, compute totals, top
    pieces/skills and streak in local time (port of `practiceController.summary`).
  - `practice.pieces` → distinct pieces, most recent first.
  - `reeds.retire` → update `is_active=false, retire_date=now`.
  - `sightReading.generate` → `generateMelody` moved to `frontend/src/lib/musicGen.js`
    (validation kept), returned as a resolved promise.
- Remove axios and `api/client.js`.

## Phase 4: AI insights Edge Function ✅
- `supabase/functions/insights/index.ts`: authenticate the caller from the
  `Authorization` header, read the last 30 sessions with a user-scoped client
  (RLS applies), check/write `insights_cache`, call Anthropic.
- Secret `ANTHROPIC_API_KEY` set via `supabase secrets set`.
- `practice.insights` calls `supabase.functions.invoke('insights')`.

## Phase 5: Cleanup, Makefile, deploy ✅
- Delete `backend/`, `docker-compose*.yml`, Dockerfiles, `.vscode` tasks that
  use Docker/PowerShell.
- `Makefile` targets:
  - `make dev` (supabase start + vite), `make stop`, `make db-reset` (local)
  - `make link` (one-time link to the hosted project)
  - `make db-push`, `make functions-deploy`, `make secrets`, `make frontend-deploy`
  - `make deploy` = db-push + functions-deploy + frontend-deploy
- `.env.example` (local) and `.env.production.example`.
- README rewritten for the new stack, including Podman setup:
  `sudo dnf install podman`, `systemctl --user enable --now podman.socket`,
  `DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock`.

## Verification
- Local: `make dev`, sign in with GitHub, add a reed, log a session with that
  reed (usage minutes go up), delete it (usage goes down), dashboard summary
  and streak, generate a melody, log a sight-reading session, insights.
- RLS: a second account cannot see or modify the first account's rows.
- Production: `make deploy`, repeat the smoke test on the Pages URL.

## Prerequisites from you
- `sudo dnf install podman` and enable the socket (Phase 1 local testing).
- `! npx supabase login` and the project ref (Phase 1 link / Phase 5 deploy).
- GitHub OAuth credentials (Phase 2).
- `! npx wrangler login` (Phase 5).
