# Musician Practice Suite

A multi-feature SaaS application for musicians: practice log with AI insights, sight-reading trainer, and reed/equipment tracker.

## Tech Stack

- **Frontend**: React + Vite, hosted on Cloudflare Pages
- **Database**: Supabase Postgres, with row-level security (RLS) on every table
- **Auth**: Supabase Auth (GitHub sign-in)
- **Server code**: one Supabase Edge Function (`insights`) that calls the Anthropic API

The browser talks to Postgres directly through `supabase-js`. RLS policies limit every
query to the signed-in user's rows, so there is no API server. Melody generation and the
practice summary run in the browser.

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- Podman (or Docker) for the local Supabase stack. On Fedora:
  ```bash
  sudo dnf install podman
  systemctl --user enable --now podman.socket
  ```
  The Makefile points the Supabase CLI at Podman's socket when `docker` isn't installed.

The Supabase CLI and Wrangler are pinned in the root `package.json`; `make install` installs them.

## Local Development

### 1. Install

```bash
make install
```

### 2. Configure OAuth for local sign-in

Create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps) with this callback URL:

```
http://127.0.0.1:54321/auth/v1/callback
```

Then:

```bash
cp supabase/.env.example supabase/.env                      # OAuth client IDs and secrets
cp supabase/functions/.env.example supabase/functions/.env  # ANTHROPIC_API_KEY
```

### 3. Start

```bash
make dev
```

This starts the local Supabase stack (Postgres, Auth, Edge Functions, Studio), applies
the migrations, and runs Vite on http://localhost:5173.

On first run, copy the API URL and publishable key printed by `npx supabase start` into
`frontend/.env` (see `frontend/.env.example`), then restart Vite.

Supabase Studio runs at http://127.0.0.1:54323.

### Common tasks

| Command | What it does |
|---|---|
| `make db-reset` | Rebuild the local database from migrations |
| `make migration name=add_x` | Create a new SQL migration in `supabase/migrations/` |
| `make status` | Show local URLs and keys |
| `make stop` | Stop the local stack |

## Deployment

### One-time setup

1. **Supabase CLI login**: `npx supabase login`
2. **Cloudflare login**: `npx wrangler login`
3. **Settings**: `cp .env.production.example .env.production` and fill it in.
4. **Link the project**: `make link`
5. **Create the Pages project**: `make pages-create`. Note the `*.pages.dev` URL it prints.
6. **Supabase Auth** (dashboard → Authentication):
   - URL Configuration: set **Site URL** to the Pages URL and add it to **Redirect URLs**.
   - Sign In / Providers: enable GitHub with the credentials of a **separate** production
     GitHub OAuth app (an OAuth app allows only one callback URL) whose callback URL is
     `https://<project-ref>.supabase.co/auth/v1/callback`.

### Deploy

```bash
make deploy
```

This runs, in order:

| Target | What it does |
|---|---|
| `make db-push` | Applies new migrations to the hosted database |
| `make secrets` | Sets `ANTHROPIC_API_KEY` for Edge Functions |
| `make functions-deploy` | Deploys the `insights` Edge Function |
| `make frontend-deploy` | Builds the frontend with the production Supabase URL and uploads it to Cloudflare Pages |

Each target can also be run on its own.

## Project Structure

```
├── Makefile                     # Dev and deploy targets (make help)
├── supabase/
│   ├── config.toml              # Local stack config (auth providers, functions)
│   ├── migrations/              # SQL schema, RLS policies, triggers
│   └── functions/insights/      # AI insights Edge Function (Deno)
└── frontend/
    └── src/
        ├── lib/supabase.js      # Supabase client
        ├── lib/musicGen.js      # Melody generator for sight reading
        ├── api/                 # Data access (supabase-js, camelCase mapping)
        ├── contexts/            # Auth session
        ├── pages/               # Dashboard, PracticeLog, SightReading, ReedTracker
        └── components/          # Feature components
```

## Data Model

| Table | Notes |
|---|---|
| `profiles` | One row per user, created automatically on sign-up |
| `reeds` | `usage_minutes` is kept in sync by a trigger on `practice_sessions` |
| `practice_sessions` | May reference only the user's own reeds (enforced by RLS) |
| `sight_reading_sessions` | Self-rating 1-5 |
| `insights_cache` | Last AI insights per user, valid for 24 hours |

## Environment Files

| File | Used for |
|---|---|
| `frontend/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` for local dev |
| `supabase/.env` | GitHub OAuth credentials for the local stack |
| `supabase/functions/.env` | Edge Function secrets for the local stack |
| `.env.production` | Everything `make deploy` needs |

All of these are git-ignored; each has a `.example` next to it.
