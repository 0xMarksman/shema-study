# Shema Study — Server

Express + WebSocket API server. Deploys to Fly.io.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Env vars

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret for signing JWT tokens (use a long random string) |
| `TURSO_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `PORT` | Port to listen on (default: `8787`) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server in watch mode |
| `npm start` | Start server (production) |

## Deployment (Fly.io)

```bash
fly auth login
fly launch --name shema-study-server
fly secrets set JWT_SECRET=... TURSO_URL=... TURSO_AUTH_TOKEN=...
fly deploy
```

## Architecture

- REST API for auth, plan state sync, groups, channels, messages, and E2E keys
- WebSocket server (`/ws?token=JWT`) for real-time message delivery
- SQLite-compatible schema via Turso/libSQL
