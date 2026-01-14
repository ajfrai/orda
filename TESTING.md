# Testing the Supabase Setup

This guide shows you how to verify that the Supabase client is configured correctly.

## Prerequisites

1. **Create a Supabase project** at https://supabase.com
2. **Run the database schema**:
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Click "Run"
3. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
4. **Fill in your Supabase credentials** in `.env.local`:
   - Get these from: Dashboard → Settings → API
   - `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The `anon` `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` - The `service_role` `secret` key

## Running the Test

```bash
npm install
npm run test:supabase
```

## What the Test Does

The test script will:

1. ✅ Verify all environment variables are set
2. ✅ Test client-side Supabase connection
3. ✅ Test service role connection
4. ✅ Verify all database tables exist (`menus`, `carts`, `cart_items`)
5. ✅ Test insert, read, and delete operations
6. ✅ Clean up test data automatically

## Expected Output

```
🧪 Testing Supabase Connection...

1️⃣  Checking environment variables...
✅ All environment variables set

2️⃣  Testing client-side connection...
✅ Client connection successful

3️⃣  Testing service role connection...
✅ Service role connection successful

4️⃣  Verifying database tables...
   ✓ menus table exists
   ✓ carts table exists
   ✓ cart_items table exists
✅ All tables verified

5️⃣  Testing data operations...
   ✓ Insert operation successful
   ✓ Read operation successful
   ✓ Delete operation successful
✅ All data operations working

🎉 All tests passed! Supabase is configured correctly.
```

## Troubleshooting

### Missing environment variables
- Make sure you copied `.env.local.example` to `.env.local`
- Verify all values are filled in (no `your_xxx_here` placeholders)

### Connection failed
- Check your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify your API keys are valid
- Make sure your Supabase project is active

### Table not found
- Run the schema SQL in your Supabase dashboard
- Make sure the SQL executed without errors
- Check the "Table Editor" to confirm tables were created

## What's Next

Once the tests pass, you can:
- Start building API routes that use the Supabase client
- Use `supabase` for client-side queries
- Use `getServiceRoleClient()` for server-side operations
- Use `subscribeToCartItems()` for real-time updates
