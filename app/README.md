# Shema Study — Frontend

Vite + React 19 + TypeScript PWA. Deploys to Vercel.

## Setup

```bash
npm install
cp .env.example .env.local   # set VITE_API_URL
npm run dev
```

## Env vars

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the backend server (e.g. `https://shema-study-server.fly.dev`) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run dev:server` | Start backend in watch mode (`../server`) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |

## Deployment

Set root directory to `app/` in Vercel. Set `VITE_API_URL` to your Fly.io server URL.
