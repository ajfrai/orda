# Authentication Implementation

## Overview

Orda now uses Supabase Auth for user authentication. Users must create an account and sign in to add items to shared carts.

## Features

- **Email/Password Authentication**: Users sign up and sign in with email and password
- **User Profiles**: Automatic profile creation with display names
- **Secure Cart Items**: Cart items are linked to authenticated users
- **Row Level Security**: Database policies ensure users can only modify their own items

## Setup Instructions

### 1. Run Database Migration

Execute the authentication schema migration in your Supabase SQL Editor:

```bash
# File: supabase/schema-auth.sql
```

This migration:
- Adds `user_id` column to `cart_items` table
- Creates `profiles` table for user display names
- Updates RLS policies to require authentication
- Sets up automatic profile creation on user signup

### 2. Configure Supabase Auth

In your Supabase project dashboard:

1. **Enable Email Auth**:
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates (optional)

2. **Set Auth Callback URL**:
   - Go to Authentication → URL Configuration
   - Add your site URL (e.g., `http://localhost:3000` for development)
   - Add redirect URL: `http://localhost:3000/auth/callback`

3. **Email Confirmation** (Optional):
   - Go to Authentication → Settings
   - Toggle "Enable email confirmations" based on your needs
   - For development, you may want to disable this

### 3. Environment Variables

Ensure these variables are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Architecture

### Components

1. **AuthModal** (`app/components/AuthModal.tsx`):
   - Combined sign-in/sign-up modal
   - Form validation
   - Error handling
   - Success messages

2. **AuthContext** (`lib/auth-context.tsx`):
   - Global authentication state
   - Sign in/sign up/sign out functions
   - Session management
   - Auth state listeners

3. **Auth Callback** (`app/auth/callback/route.ts`):
   - Handles email confirmation redirects
   - Exchanges auth codes for sessions

### API Routes

**POST `/api/cart/[id]/items`**:
- Adds items to cart for authenticated users
- Requires `Authorization: Bearer <token>` header
- Automatically links item to user's ID
- Fetches user's display name from profile

**DELETE `/api/cart/[id]/items?itemId=<id>`**:
- Removes cart items
- Users can only delete their own items (enforced by RLS)

### Database Schema

**profiles** table:
```sql
- id (uuid, FK to auth.users)
- email (text)
- display_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**cart_items** table (updated):
```sql
- id (uuid)
- cart_id (uuid, FK to carts)
- user_id (uuid, FK to auth.users) -- NEW
- user_name (text) -- Display name from profile
- item_name (text)
- item_price (decimal)
- is_price_estimate (boolean)
- quantity (integer)
- notes (text)
- created_at (timestamp)
```

### Row Level Security Policies

**Menus**:
- Anyone can read menus
- Only authenticated users can create menus

**Carts**:
- Anyone can read carts (needed for sharing)
- Only authenticated users can create/update carts

**Cart Items**:
- Authenticated users can read all cart items (to see group orders)
- Users can only create items with their own user_id
- Users can only update/delete their own items

**Profiles**:
- Anyone can read profiles (for display names)
- Users can only update their own profile

## User Flow

### New User Registration

1. User clicks "Sign In" on cart page
2. Clicks "Don't have an account? Sign up"
3. Enters name, email, and password
4. Clicks "Create Account"
5. Profile automatically created via database trigger
6. If email confirmation enabled: user checks email
7. User is signed in and can add items to cart

### Existing User Sign In

1. User clicks "Sign In" on cart page
2. Enters email and password
3. Clicks "Sign In"
4. User is signed in and can add items to cart

### Adding Items to Cart

1. User must be signed in
2. Clicks on a menu item
3. Add Item Modal opens
4. Selects quantity and adds notes
5. Clicks "Add to Cart"
6. Item is added with user's ID and display name
7. Cart updates in real-time for all users viewing the cart

## Security Considerations

1. **Authentication Required**: Users must be authenticated to add items
2. **Token-based API Access**: API routes verify JWT tokens
3. **RLS Enforcement**: Database policies prevent unauthorized modifications
4. **Service Role Limited**: Service role client only used for read operations
5. **Display Name Stored**: User's display name is stored with each cart item for performance

## Migration from localStorage

Previous implementation used `localStorage` for user names. With authentication:

- **Breaking Change**: Existing cart items without `user_id` will not be accessible
- **Data Migration**: Consider running a script to link old items if needed
- **Recommendation**: For production, announce the change and allow users to re-add items

## Testing

### Manual Testing Checklist

- [ ] User can sign up with email/password
- [ ] User receives confirmation email (if enabled)
- [ ] User can sign in with email/password
- [ ] User name displays in cart header
- [ ] User can add items to cart when authenticated
- [ ] Unauthenticated user sees "Sign In" button
- [ ] Clicking menu item while unauthenticated shows auth modal
- [ ] User can sign out
- [ ] Cart items show correct user names
- [ ] Users can only delete their own items
- [ ] Real-time updates work correctly

## Troubleshooting

### "Unauthorized" errors when adding items

- Check that user is signed in
- Verify auth token is being sent in Authorization header
- Check Supabase RLS policies are correctly applied

### Profile not created on signup

- Verify the database trigger is installed
- Check Supabase logs for errors
- Manually create profile if needed

### Email confirmation not working

- Check Supabase email provider settings
- Verify redirect URLs are configured
- Check spam folder for confirmation emails

## Future Enhancements

- **Social Auth**: Add Google, GitHub, etc.
- **Profile Pictures**: Upload and display user avatars
- **Email Invites**: Invite friends to carts via email
- **Cart Permissions**: Owner can manage who can add items
- **User Preferences**: Save dietary restrictions, favorites, etc.
