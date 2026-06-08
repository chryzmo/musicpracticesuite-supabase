# Musician Practice Suite

A multi-feature SaaS application for musicians: practice log with AI insights, sight-reading trainer, and reed/equipment tracker.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **AI**: Anthropic API (Claude)

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Local Development Setup

### 1. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. For local Docker dev, the defaults work if you keep `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` consistent.

Generate a secure `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Get your `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com).

### 2. Start with Docker Compose

```bash
docker compose up --build
```

This starts:
- PostgreSQL on port `5432`
- Backend API on port `3001`
- Frontend dev server on port `5173`

### 3. Run database migrations

In a separate terminal, once the backend container is running:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

### 4. Open the app

Visit [http://localhost:5173](http://localhost:5173)

---

## Running Without Docker

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:3001`.

---

## Project Structure

```
├── backend/
│   ├── prisma/schema.prisma    # Database schema
│   └── src/
│       ├── index.js            # Express entry point
│       ├── middleware/         # auth, errorHandler
│       ├── routes/             # reeds, practice, sightReading
│       ├── controllers/        # business logic
│       ├── services/           # aiInsights, musicGen
│       └── db/prisma.js        # Prisma client singleton
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/client.js       # Axios client
        ├── pages/              # Dashboard, PracticeLog, SightReading, ReedTracker
        ├── components/         # Feature components
        └── hooks/              # Custom React hooks
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` | DB username (Docker Compose) |
| `POSTGRES_PASSWORD` | DB password (Docker Compose) |
| `POSTGRES_DB` | DB name (Docker Compose) |
| `AUTH_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI insights |
| `PORT` | Backend port (default: 3001) |
| `VITE_API_BASE_URL` | Backend URL seen by the browser |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/reeds` | List active reeds |
| POST | `/api/reeds` | Create a reed |
| PATCH | `/api/reeds/:id` | Update a reed |
| DELETE | `/api/reeds/:id` | Retire a reed |
| GET | `/api/practice` | List practice sessions |
| POST | `/api/practice` | Log a session |
| GET | `/api/practice/insights` | AI insights |
| POST | `/api/sight-reading/generate` | Generate sheet music |
| POST | `/api/sight-reading/session` | Log a sight-reading session |
