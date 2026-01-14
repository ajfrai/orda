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

### Code
- [x] TypeScript type definitions (`types/index.ts`) - Menu, Cart, CartItem models + API types
- [x] Supabase client library (`lib/supabase.ts`) - Client/server connections, helpers, real-time subscriptions

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

### 2026-01-14 (Session 1)
- Initial planning session
- Set up Next.js, Supabase, Vercel
- Created 14 GitHub issues for implementation tasks

### 2026-01-14 (Session 2)
- Completed #1: TypeScript type definitions
  - Created `types/index.ts` with Menu, Cart, CartItem interfaces
  - Added API request/response types
  - Defined UI helper types and tip presets
- Completed #2: Supabase client library
  - Created `lib/supabase.ts` with client and service role connections
  - Added `lib/database.types.ts` for type-safe database queries
  - Implemented helper functions (getCartWithData, subscribeToCartItems)
  - Created comprehensive test script with setup guide (TESTING.md)
  - Added `.env.local.example` template

### 2026-01-14 (Session 3)
- Completed #3: Tax rates lookup table
  - Created `lib/tax-rates.ts` with all 50 US states + DC tax rates
  - Implemented fuzzy matching for state input (abbreviations, full names, partial matches)
- Completed #4: URL validator with SSRF protection
  - Created `lib/url-validator.ts` to validate PDF/image URLs
  - Blocks private IPs, localhost, metadata endpoints
  - Supports .pdf, .jpg, .jpeg, .png, .gif, .webp extensions
- Completed #5: Claude API wrapper
  - Created `lib/claude.ts` with Claude 4.5 Sonnet integration
  - Supports both document type (PDFs) and image types
  - Handles URL-based and file upload analysis
  - Added streaming support with progress callbacks
  - Extracts dietary indicators (spicy, vegetarian, vegan, gluten-free, kosher)
- Completed #7: Parse-menu API endpoint
  - Created `app/api/parse-menu/route.ts` with dual input support
  - Handles FormData (file uploads) and JSON (URLs)
  - Implements Server-Sent Events (SSE) for streaming progress
  - Comprehensive error logging with full stack traces
  - Stores parsed menu data in Supabase with all dietary indicators
- Completed #6: Landing page UI
  - Updated `app/page.tsx` with tab-based interface
  - "Upload File" tab with drag-and-drop support
  - "Paste URL" tab for PDF/image URLs
  - Progress indicators and detailed error display
  - Redirects to cart page on success
- Database schema fix
  - Made `pdf_url` nullable in menus table to support uploaded files
  - Created migration `supabase/migrations/001_make_pdf_url_nullable.sql`
  - Updated TypeScript types to reflect `pdf_url: string | null`
- Completed cart page implementation
  - Created `app/api/cart/[id]/route.ts` for fetching cart data
  - Built text-only cart page in `app/cart/[id]/page.tsx`
  - Displays parsed menu items grouped by category
  - Shows dietary indicators with emoji icons
  - Displays restaurant info, location, and tax rate
  - Shows current cart items if any exist
  - Loading states and error handling
  - **Bug fix**: Cart API was incorrectly querying non-existent `menu_items` table; fixed to read items from `menus.items` JSONB column as per schema

### Key Accomplishments (Session 3)
- Full menu parsing pipeline working (PDF/image upload → Claude analysis → database storage)
- Support for both file uploads and URL-based menus
- Streaming progress indicators during Claude API calls (backend SSE infrastructure ready)
- Comprehensive error logging for debugging
- Database constraint fix for uploaded files
- Working cart page to verify parsed menu data

### Known Issues / Pending Work
- Streaming progress UI not yet implemented on frontend (backend SSE ready, needs frontend EventSource integration)
- Debug error display needs to be removed before production (tracked in .github/ISSUE_TEMPLATE.md)
- Need to implement remaining cart functionality (add items, update quantities, tip calculation)
