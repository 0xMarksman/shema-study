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
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_SUBJECT` | Contact claim for VAPID (for example `mailto:admin@example.com`) |
| `PORT` | Port to listen on (default: `8787`) |

### Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Copy the generated `publicKey` / `privateKey` into your environment.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server in watch mode |
| `npm start` | Start server (production) |

## Deployment (Fly.io)

```bash
fly auth login
fly launch --name shema-study-server
fly secrets set JWT_SECRET=... TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:admin@example.com
fly deploy
```

## Architecture

- REST API for auth, plan state sync, groups, channels, messages, and E2E keys
- WebSocket server (`/ws?token=JWT`) for real-time message delivery
- SQLite-compatible schema via Turso/libSQL
