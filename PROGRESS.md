# Orda Development Progress

> **IMPORTANT**: Read this file at the start of every development session to understand current state.

## Current Status: Setup Complete, Ready for Implementation

## What's Done

### Infrastructure
- [x] Next.js 14 project initialized with TypeScript + Tailwind
- [x] Supabase project created with database tables
- [x] Vercel deployment configured at `orda-beta.vercel.app`
- [x] Environment variables set up (local + Vercel)
- [x] GitHub repository at `github.com/ajfrai/orda`

### Database Schema (Supabase)
Tables created:
- `menus` - Stores parsed menu data from PDFs
- `carts` - Shareable cart instances linked to menus
- `cart_items` - Individual items added by users

Real-time enabled on `cart_items` table.

### Documentation
- `PLAN.md` - Full application architecture and design decisions
- `supabase/schema.sql` - Database schema (already applied)

## What's Not Done

See GitHub Issues #1-14 for all remaining tasks.

### Recommended Build Order

**Phase 1: Foundation (no dependencies)**
1. #1 - TypeScript type definitions
2. #2 - Supabase client library
3. #3 - Tax rates lookup table
4. #4 - URL validator

**Phase 2: Core Logic**
5. #5 - Claude API wrapper (depends on #1)
6. #7 - Parse-menu API route (depends on #2, #3, #4, #5)
7. #8 - Cart API routes (depends on #1, #2)

**Phase 3: UI Components**
8. #6 - Landing page UI (depends on #7)
9. #9 - Name modal component
10. #10 - Menu browser component (depends on #1)
11. #11 - Add item modal component (depends on #1)
12. #12 - Cart view component (depends on #1, #2)
13. #13 - Totals breakdown component (depends on #1)

**Phase 4: Integration**
14. #14 - Cart page (depends on #8, #9, #10, #11, #12, #13)

## Key Files Reference

```
orda/
├── PLAN.md              # Architecture & design decisions
├── PROGRESS.md          # This file - development status
├── .env.local           # Local environment variables (gitignored)
├── supabase/schema.sql  # Database schema (already applied)
├── app/                 # Next.js app directory
├── lib/                 # Utility libraries (to be created)
├── components/          # React components (to be created)
└── types/               # TypeScript definitions (to be created)
```

## Environment Variables

Required in `.env.local` and Vercel:
- `ANTHROPIC_API_KEY` - Claude API
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

## Deployment

- **Production**: Vercel auto-deploys from `main` branch
- **URL**: https://orda-beta.vercel.app

## Session Log

### 2026-01-14
- Initial planning session
- Set up Next.js, Supabase, Vercel
- Created 14 GitHub issues for implementation tasks
