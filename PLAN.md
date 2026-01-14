# Orda - Shared Menu Ordering App

## Overview

A web app where someone pastes a restaurant menu PDF link, and it generates a shareable cart where friends can collaboratively build an order with automatic cost splitting.

---

## User Flow

### 1. Landing Page (`/`)
- App name, one-line explanation
- Input field for PDF URL
- "Create Cart" button
- Loading state while processing

### 2. Menu Processing (behind the scenes)
- Backend fetches PDF securely
- Claude analyzes via vision and returns:
  - Is this a menu? (yes/no)
  - Restaurant name
  - Location (city/state for tax estimation)
  - Categorized menu items (name, price or "estimated: $X", description)
- If not a menu → error message: "This PDF does not appear to be a restaurant menu. Please try again."
- If valid → create cart, redirect to `/cart/[id]`

### 3. Cart Page (`/cart/[id]`)
- **First visit**: "Enter your name" modal (saved to localStorage)
- **Header**: Restaurant name, shareable link button
- **Menu section**: Browse by category, tap item to add
- **Add item modal**: Quantity selector, notes field, "Add to cart"
- **Cart section**: Live-updating list grouped by person
- **Totals section**:
  - Subtotal
  - Estimated tax (based on location, state lookup table)
  - Tip (configurable: 15%, 18%, 20%, 22%, custom)
  - Grand total
  - Per-person breakdown

---

## Data Models

```
Menu
├── id (uuid)
├── created_at
├── pdf_url
├── restaurant_name
├── location (city, state)
├── tax_rate (decimal, looked up from state)
└── items (JSON array)
    └── { category, name, description, price, is_estimate }

Cart
├── id (uuid, used in shareable URL)
├── menu_id (foreign key)
├── created_at
└── tip_percentage (default 18)

CartItem
├── id (uuid)
├── cart_id (foreign key)
├── user_name
├── item_name
├── item_price
├── is_price_estimate
├── quantity
├── notes
└── created_at
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/parse-menu` | Fetch PDF, validate, parse with Claude vision |
| GET | `/api/cart/[id]` | Get cart + menu + items |
| POST | `/api/cart/[id]/items` | Add item to cart |
| PATCH | `/api/cart/[id]/items/[itemId]` | Update quantity/notes |
| DELETE | `/api/cart/[id]/items/[itemId]` | Remove item (own items only) |
| PATCH | `/api/cart/[id]/tip` | Update tip percentage |

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14 (App Router) | Full-stack, easy Vercel deploy |
| Hosting | Vercel | Zero-config, generous free tier |
| Database | Supabase (Postgres) | Free tier, built-in real-time |
| Real-time | Supabase Realtime | Live cart updates, no extra setup |
| AI | Claude API (Vision) | Menu parsing + validation via images |
| PDF → Images | pdf2pic or similar | Convert PDF pages for Claude vision |
| Styling | Tailwind CSS | Fast, mobile-first friendly |

---

## Security Measures

| Concern | Mitigation |
|---------|------------|
| Malicious URLs | Validate URL format, block private IPs |
| Large files | 10MB size limit, timeout after 30s |
| Rate abuse | Rate limit `/api/parse-menu` (5 requests/minute/IP) |
| PDF exploits | Use established parser, no embedded content execution |
| Input injection | Sanitize all user inputs before DB storage |
| API key exposure | All Claude calls server-side only |
| Item deletion | Users can only delete their own items (localStorage identity) |

---

## Project Structure

```
orda/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── cart/[id]/page.tsx          # Shared cart page
│   ├── api/
│   │   ├── parse-menu/route.ts     # PDF → Claude → menu data
│   │   └── cart/
│   │       ├── [id]/route.ts       # GET cart
│   │       ├── [id]/items/route.ts # POST new item
│   │       ├── [id]/items/[itemId]/route.ts # PATCH/DELETE
│   │       └── [id]/tip/route.ts   # PATCH tip %
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── claude.ts                   # Claude API wrapper
│   ├── tax-rates.ts                # State → tax rate lookup
│   ├── pdf-to-images.ts            # PDF conversion utility
│   └── url-validator.ts            # Security checks
├── components/
│   ├── menu-browser.tsx            # Category/item display
│   ├── cart-view.tsx               # Live cart with items
│   ├── add-item-modal.tsx          # Quantity, notes
│   ├── totals-breakdown.tsx        # Tax, tip, per-person
│   └── name-modal.tsx              # First-visit name entry
└── types/
    └── index.ts                    # TypeScript interfaces
```

---

## Setup Requirements

Accounts needed (all have free tiers):
1. **GitHub** - Code repository
2. **Vercel** - Hosting + deployment
3. **Supabase** - Database + real-time
4. **Anthropic** - Claude API key
