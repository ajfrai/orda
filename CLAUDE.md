# Claude Code Assistant Guidelines for Orda

> **AI Assistant Onboarding**: This file provides comprehensive context about the Orda codebase, architecture, conventions, and development workflows.

## Table of Contents
- [Environment Setup](#environment-setup)
- [Project Overview](#project-overview)
- [Codebase Structure](#codebase-structure)
- [Development Workflows](#development-workflows)
- [Code Patterns & Conventions](#code-patterns--conventions)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Security Requirements](#security-requirements)
- [Testing](#testing)
- [Issue Management](#issue-management)

---

## Environment Setup

### Required Environment Variables

**CRITICAL**: Before starting any development work, **always check for and read environment variables** from the `.env.local` file (if it exists). The application requires these variables to function:

```bash
# Claude AI for menu parsing
ANTHROPIC_API_KEY=sk-ant-...

# Supabase Database (public, safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role (private, server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Instructions for AI Assistants:**
1. Check if `.env.local` exists at the project root
2. If it exists, read it to understand the current configuration
3. Never log or expose these values in responses
4. If missing and needed for a task, inform the user which variables are required
5. Validate environment variable usage follows security patterns (see [Security Requirements](#security-requirements))

### Checking Environment Status

```bash
# Check if .env.local exists
ls -la .env.local

# Test Supabase connection
npm run test:supabase
```

---

## Project Overview

**Orda** is a shared menu ordering app that enables collaborative food ordering with automatic cost splitting.

### Core Features
- Upload restaurant menu PDFs or images
- AI-powered menu parsing using Claude Vision
- Real-time collaborative cart sharing
- Automatic tax and tip calculation
- Per-person cost splitting
- Live streaming menu extraction with progress updates

### Tech Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19.2.3 + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Realtime)
- **AI**: Claude 4.5 Sonnet (@anthropic-ai/sdk 0.71.2)
- **Deployment**: Vercel
- **Testing**: tsx for script execution

### Live Deployment
- **Production**: https://orda-beta.vercel.app
- **Auto-deploys**: From `main` branch

---

## Codebase Structure

```
orda/
├── app/                              # Next.js 16 App Router
│   ├── page.tsx                      # Landing page (menu upload/URL input)
│   ├── layout.tsx                    # Root layout with metadata
│   ├── globals.css                   # Global styles + animations
│   ├── cart/
│   │   └── [id]/page.tsx            # Cart page with real-time streaming (848 lines)
│   ├── components/                   # React components
│   │   ├── MenuItemCard.tsx         # Menu item display with dietary tags
│   │   ├── add-item-modal.tsx       # Add items modal (quantity/notes)
│   │   └── AuthModal.tsx            # User name entry modal
│   └── api/                          # Backend API routes
│       ├── parse-menu/route.ts      # Menu parsing with streaming SSE (643 lines)
│       ├── menu/[id]/route.ts       # Menu CRUD operations
│       └── cart/
│           ├── create/route.ts      # Create empty cart
│           ├── [id]/route.ts        # Get/update cart + tip percentage
│           └── [id]/items/route.ts  # Add/delete cart items
│
├── lib/                              # Utility libraries
│   ├── supabase.ts                  # Supabase client + helpers (125 lines)
│   ├── claude.ts                    # Claude API wrapper with streaming (623 lines)
│   ├── claude.test.ts               # Unit tests for streaming parser
│   ├── tax-rates.ts                 # US state tax rate lookup (131 lines)
│   ├── url-validator.ts             # SSRF protection (146 lines)
│   └── auth-context.tsx             # Auth context (defined, not actively used)
│
├── types/
│   └── index.ts                     # TypeScript interfaces (shared types)
│
├── supabase/
│   ├── schema.sql                   # Main database schema
│   ├── schema-auth.sql              # Auth schema (if used)
│   └── migrations/                  # Database migrations
│       └── 001_make_pdf_url_nullable.sql
│
├── scripts/
│   └── test-supabase.ts            # Supabase connection test
│
├── docs/                            # Documentation
├── public/                          # Static assets
│
├── CLAUDE.md                        # This file (AI assistant guidelines)
├── PLAN.md                          # Architecture and roadmap
├── README.md                        # Project README
│
└── Config Files:
    ├── package.json                 # Dependencies and scripts
    ├── tsconfig.json                # TypeScript configuration
    ├── next.config.ts               # Next.js configuration
    ├── postcss.config.mjs           # PostCSS + Tailwind
    ├── eslint.config.mjs            # ESLint rules
    └── tailwind.config.ts           # Tailwind CSS configuration
```

### Key File Sizes & Complexity
- **`app/cart/[id]/page.tsx`** (848 lines) - Complex real-time streaming UI
- **`app/api/parse-menu/route.ts`** (643 lines) - Streaming menu parser with SSE
- **`lib/claude.ts`** (623 lines) - Claude integration with streaming support
- **`app/page.tsx`** (310 lines) - Landing page with upload UI
- **`add-item-modal.tsx`** (207 lines) - Modal with quantity/notes
- **`url-validator.ts`** (146 lines) - Security validation
- **`tax-rates.ts`** (131 lines) - Complete US tax table
- **`lib/supabase.ts`** (125 lines) - Database client

---

## Development Workflows

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3000

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm run start

# Test Supabase connection
npm run test:supabase
```

### Development Process

1. **Check GitHub Issues**: Review current tasks and priorities
2. **Read PLAN.md**: Understand architecture and implementation roadmap
3. **Check Environment**: Verify `.env.local` exists with required variables
4. **Create Feature Branch**: Follow naming convention `claude/<description>-<id>`
5. **Implement Changes**: Follow code patterns and conventions below
6. **Test Locally**: Verify changes work end-to-end
7. **Commit**: Clear, descriptive commit messages
8. **Push**: To feature branch
9. **Create PR**: When ready for review

### Git Workflow

```bash
# Check current branch
git status

# Create feature branch (AI assistants use claude/ prefix)
git checkout -b claude/feature-name-sessionId

# Stage and commit changes
git add .
git commit -m "Descriptive commit message"

# Push to remote
git push -u origin claude/feature-name-sessionId

# Create PR (using gh CLI)
gh pr create --title "Feature description" --body "Details..."
```

---

## Code Patterns & Conventions

### API Route Structure

**Next.js 16** requires async params handling:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16 requirement)
    const { id } = await params;

    // Use service role client for server-side operations
    const supabase = getServiceRoleClient();

    // Perform database operations
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[ERROR]', error);
      return NextResponse.json(
        { error: 'Error message' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Server-Sent Events (SSE) Pattern

For streaming responses (see `app/api/parse-menu/route.ts`):

```typescript
const encoder = new TextEncoder();

const stream = new ReadableStream({
  async start(controller) {
    // Send progress updates
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '...' })}\n\n`)
    );

    // Stream menu items as they're parsed
    for (const item of menuItems) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'item', data: item })}\n\n`)
      );
    }

    // Signal completion
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`)
    );
    controller.close();
  }
});

return new NextResponse(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Client Component Patterns

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data or set up subscriptions
  }, []);

  return (
    <div className="container mx-auto p-4">
      {/* Component JSX */}
    </div>
  );
}
```

### Database Operations

```typescript
// Server-side (API routes) - bypasses RLS
import { getServiceRoleClient } from '@/lib/supabase';
const supabase = getServiceRoleClient();

// Client-side - enforces RLS
import { supabase } from '@/lib/supabase';

// Always handle errors
const { data, error } = await supabase
  .from('table')
  .select('*');

if (error) {
  console.error('[ERROR]', error);
  // Handle error appropriately
}
```

### Error Handling

**Development Mode**: Show detailed errors for debugging

```typescript
catch (error) {
  console.error('[DEBUG]', {
    message: error.message,
    stack: error.stack,
    context: { /* relevant context */ }
  });

  return NextResponse.json({
    error: 'Detailed error message',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  }, { status: 500 });
}
```

### TypeScript Conventions

- Use interfaces from `types/index.ts` for shared types
- Prefer explicit types over `any`
- Use type inference where obvious
- Export types that may be reused

```typescript
import type { MenuItem, Cart, CartItem } from '@/types';
```

### Tailwind CSS Patterns

```tsx
{/* Container with max-width */}
<div className="container mx-auto max-w-4xl p-4">

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Dark mode support */}
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

{/* Button styles */}
<button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">

{/* Animations */}
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
```

---

## Database Schema

### Tables

#### `menus`
```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pdf_url TEXT,                    -- Original menu source (nullable)
  restaurant_name TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  tax_rate DECIMAL(5,4),          -- e.g., 0.0725 for 7.25%
  items JSONB NOT NULL             -- Array of menu items
);
```

#### `carts`
```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  menu_id UUID REFERENCES menus(id),
  tip_percentage INTEGER DEFAULT 18  -- 0-100
);
```

#### `cart_items`
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_price DECIMAL(10,2) NOT NULL,
  is_price_estimate BOOLEAN DEFAULT FALSE,
  quantity INTEGER NOT NULL,
  notes TEXT
);
```

### Row Level Security (RLS)

- **Enabled**: On all tables
- **Policies**: Public read/write (intentional - no auth required)
- **Realtime**: Enabled only on `cart_items`

### Helper Functions

```typescript
// lib/supabase.ts
export async function getCartWithData(cartId: string) {
  const supabase = getServiceRoleClient();

  const { data: cart } = await supabase
    .from('carts')
    .select('*, menu:menus(*)')
    .eq('id', cartId)
    .single();

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  return { cart, menu: cart?.menu, cartItems };
}
```

---

## API Routes

### POST `/api/parse-menu`
**Parse menu from PDF/image with streaming**

**Request:**
```typescript
{
  url?: string;           // Menu URL (PDF or image)
  file?: File;           // Or uploaded file
  cartId?: string;       // Optional pre-created cart
}
```

**Response:** Server-Sent Events (SSE)
```typescript
// Event types:
{ type: 'status', message: string }
{ type: 'metadata', data: { restaurant_name, location, tax_rate } }
{ type: 'item', data: MenuItem }
{ type: 'menu_extraction_end' }
{ type: 'complete', data: { cartId, restaurant_name } }
{ type: 'error', error: string }
```

### POST `/api/cart/create`
**Create empty cart**

**Response:**
```typescript
{ cartId: string }
```

### GET `/api/cart/[id]`
**Get cart with menu and items**

**Response:**
```typescript
{
  cart: Cart,
  menu: Menu,
  cartItems: CartItem[]
}
```

### PATCH `/api/cart/[id]`
**Update cart (tip percentage)**

**Request:**
```typescript
{ tip_percentage: number }  // 0-100
```

### POST `/api/cart/[id]/items`
**Add item to cart**

**Request:**
```typescript
{
  user_name: string,
  item_name: string,
  item_price: number,
  quantity: number,
  notes?: string,
  is_price_estimate?: boolean
}
```

### DELETE `/api/cart/[id]/items?itemId=<uuid>`
**Remove item from cart**

---

## Security Requirements

### Critical Rules

1. **API Keys**: Never expose in client-side code
   - ✅ `lib/claude.ts` uses `process.env.ANTHROPIC_API_KEY` (server-side only)
   - ✅ API routes use `getServiceRoleClient()` (server-side only)
   - ❌ Never use service role key in client components

2. **SSRF Protection**: Use `lib/url-validator.ts` for all URLs
   ```typescript
   import { validateUrl } from '@/lib/url-validator';

   const validation = await validateUrl(userProvidedUrl);
   if (!validation.isValid) {
     return NextResponse.json({ error: validation.error }, { status: 400 });
   }
   ```

3. **Input Validation**: Sanitize all user inputs
   - Validate types and formats
   - Check length limits
   - Escape special characters where needed

4. **Database Security**:
   - Use parameterized queries (Supabase client handles this)
   - Validate UUIDs before queries
   - Use RLS policies appropriately

5. **File Upload Limits**:
   - Max size: 10MB
   - Allowed types: PDF, JPEG, PNG, GIF, WebP
   - Validate content-type header

### Security Checklist

Before deploying any changes:
- [ ] No API keys in client code
- [ ] All URLs validated with `validateUrl()`
- [ ] User inputs sanitized
- [ ] Error messages don't leak sensitive info
- [ ] File uploads have size/type limits
- [ ] Service role client only in API routes

---

## Testing

### Manual Testing

1. **Menu Upload Flow**:
   - Upload PDF → Verify streaming updates → Check cart created
   - Upload image → Verify parsing → Check menu items
   - Invalid URL → Verify error handling

2. **Cart Collaboration**:
   - Multiple users → Add items → Verify real-time updates
   - Edit quantities → Verify totals recalculate
   - Delete items → Verify removal

3. **Tax/Tip Calculations**:
   - Change tip percentage → Verify totals update
   - Different states → Verify correct tax rates
   - Per-person split → Verify accurate distribution

### Unit Tests

```bash
# Run Claude streaming parser tests
npm run test
```

Currently minimal testing - Jest setup needed for comprehensive coverage.

---

## Issue Management

### Project Tracking

Track work through:
- **GitHub Issues**: Current tasks, bugs, and features
- **PLAN.md**: Architecture and implementation roadmap

### Acceptance Criteria Standards

Every GitHub issue must have clear, verifiable acceptance criteria:

- **Objective and Testable**: Criteria should be unambiguous and verifiable
- **Specific Outcomes**: Define what success looks like with concrete details
- **Avoid Subjective Terms**: No "works well", "looks nice", "is good"

**Examples:**
- ✅ Good: "API returns 404 when cart ID doesn't exist"
- ✅ Good: "Landing page includes URL input field and Create Cart button"
- ✅ Good: "getTaxRate('CA') returns 0.0725"
- ❌ Bad: "API works well"
- ❌ Bad: "UI looks nice"
- ❌ Bad: "Component is functional"

**When writing issues:**
- If acceptance criteria are missing: Discuss with user to define them
- If acceptance criteria are unclear: Ask questions to clarify what "done" means
- Review criteria before starting work

### Project Wrap-Up

During project wrap-up, review PLAN.md and GitHub issues:

1. **Verify Acceptance Criteria**: Check each issue has clear, verifiable criteria
2. **Close Completed Issues**: Match implementation against acceptance criteria
   - If all criteria are met: Close the issue
   - If partially complete: Document what's done and what remains
   - If blocked: Note blockers and dependencies

---

## User Flow Documentation

When proposing changes to **app user flows** (how users interact with the Orda UI), **always** provide detailed "before" and "after" flow descriptions.

### Flow Description Requirements

Each flow description must include:

1. **Initial State**: What the user sees when they begin
2. **User Actions**: How they interact (clicks, inputs, gestures)
3. **State Transitions**: What views/screens they see next
4. **Intermediate States**: Any loading, validation, or feedback states
5. **Terminal State**: The final state where the flow completes

### Format

```
#### Before Flow:
1. User sees [initial view/screen]
2. User [performs action]
3. System [shows/responds with]
4. User sees [next view]
5. ... continue until terminal state

#### After Flow:
1. User sees [initial view/screen]
2. User [performs action]
3. System [shows/responds with]
4. User sees [next view]
5. ... continue until terminal state
```

### Verification Step

After implementing the app flow change:
1. Test the actual user flow end-to-end in the app
2. Write a concise summary of the implemented flow
3. Compare the actual flow with the original "after" description
4. Call out any discrepancies between intended and actual behavior

This ensures the app behavior matches the design intent and prevents misalignment between vision and reality.

---

## Reference Files

- **`CLAUDE.md`** (this file) - AI assistant guidelines and codebase overview
- **`PLAN.md`** - Overall architecture and implementation roadmap
- **`README.md`** - User-facing project documentation
- **`supabase/schema.sql`** - Database schema reference
- **`types/index.ts`** - TypeScript type definitions
- **GitHub Issues** - Task tracking and feature development

---

## Quick Reference

### Common Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run test:supabase    # Test database connection
gh issue list            # View GitHub issues
gh pr create             # Create pull request
```

### Important File Locations

- Environment: `.env.local` (not in repo)
- Database schema: `supabase/schema.sql`
- Types: `types/index.ts`
- API routes: `app/api/`
- Components: `app/components/`
- Utilities: `lib/`

### External Resources

- **Production App**: https://orda-beta.vercel.app
- **Supabase Dashboard**: Check `.env.local` for project URL
- **Anthropic Console**: https://console.anthropic.com
- **GitHub Repo**: https://github.com/ajfrai/orda

---

*Last Updated: 2026-01-17*
