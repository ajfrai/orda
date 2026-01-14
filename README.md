# Orda

Shared menu ordering app. Paste a restaurant menu PDF, get a shareable cart where friends can collaboratively build an order with automatic cost splitting.

> **For AI Assistants / Claude Code**: Read `PROGRESS.md` before starting any development work on this project. It contains current status, build order, and session history.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

- **[PROGRESS.md](./PROGRESS.md)** - Current development status and session log (READ THIS FIRST)
- **[PLAN.md](./PLAN.md)** - Architecture, design decisions, and technical spec
- **[GitHub Issues](https://github.com/ajfrai/orda/issues)** - Implementation tasks

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres + Realtime)
- **AI**: Claude API (Vision for PDF parsing)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Deployment

Production auto-deploys from `main` branch to: https://orda-beta.vercel.app
