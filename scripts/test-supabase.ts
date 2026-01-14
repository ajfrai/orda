#!/usr/bin/env tsx

/**
 * Test script to verify Supabase connection and database setup
 *
 * Usage:
 *   npx tsx scripts/test-supabase.ts
 *
 * Prerequisites:
 *   1. Copy .env.local.example to .env.local
 *   2. Fill in your Supabase credentials
 *   3. Run the schema.sql in your Supabase dashboard
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { supabase, getServiceRoleClient } from '../lib/supabase';

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n');

  // Test 1: Environment variables
  console.log('1️⃣  Checking environment variables...');
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missing = Object.entries(envVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('\n📝 Please copy .env.local.example to .env.local and fill in the values.\n');
    process.exit(1);
  }
  console.log('✅ All environment variables set\n');

  // Test 2: Client-side connection
  console.log('2️⃣  Testing client-side connection...');
  try {
    const { data, error } = await supabase.from('menus').select('count');
    if (error) throw error;
    console.log('✅ Client connection successful\n');
  } catch (error) {
    console.error('❌ Client connection failed:', error);
    process.exit(1);
  }

  // Test 3: Service role connection
  console.log('3️⃣  Testing service role connection...');
  try {
    const client = getServiceRoleClient();
    const { data, error } = await client.from('carts').select('count');
    if (error) throw error;
    console.log('✅ Service role connection successful\n');
  } catch (error) {
    console.error('❌ Service role connection failed:', error);
    process.exit(1);
  }

  // Test 4: Table structure
  console.log('4️⃣  Verifying database tables...');
  const client = getServiceRoleClient();

  try {
    // Check menus table
    const { error: menusError } = await client.from('menus').select('*').limit(0);
    if (menusError) throw new Error(`menus table: ${menusError.message}`);
    console.log('   ✓ menus table exists');

    // Check carts table
    const { error: cartsError } = await client.from('carts').select('*').limit(0);
    if (cartsError) throw new Error(`carts table: ${cartsError.message}`);
    console.log('   ✓ carts table exists');

    // Check cart_items table
    const { error: itemsError } = await client.from('cart_items').select('*').limit(0);
    if (itemsError) throw new Error(`cart_items table: ${itemsError.message}`);
    console.log('   ✓ cart_items table exists');

    console.log('✅ All tables verified\n');
  } catch (error) {
    console.error('❌ Table verification failed:', error);
    console.error('\n📝 Please run supabase/schema.sql in your Supabase SQL Editor.\n');
    process.exit(1);
  }

  // Test 5: Insert and read test data
  console.log('5️⃣  Testing data operations...');
  try {
    // Insert a test menu
    const { data: menu, error: insertError } = await client
      .from('menus')
      .insert({
        pdf_url: 'https://example.com/test-menu.pdf',
        restaurant_name: 'Test Restaurant',
        location_city: 'San Francisco',
        location_state: 'CA',
        tax_rate: 0.0875,
        items: [{ category: 'Test', name: 'Test Item', price: 10.99, is_estimate: false }],
      })
      .select()
      .single();

    if (insertError) throw insertError;
    console.log('   ✓ Insert operation successful');

    // Read it back
    const { data: readMenu, error: readError } = await client
      .from('menus')
      .select('*')
      .eq('id', menu.id)
      .single();

    if (readError) throw readError;
    if (readMenu.restaurant_name !== 'Test Restaurant') {
      throw new Error('Data mismatch on read');
    }
    console.log('   ✓ Read operation successful');

    // Clean up
    const { error: deleteError } = await client
      .from('menus')
      .delete()
      .eq('id', menu.id);

    if (deleteError) throw deleteError;
    console.log('   ✓ Delete operation successful');

    console.log('✅ All data operations working\n');
  } catch (error) {
    console.error('❌ Data operations failed:', error);
    process.exit(1);
  }

  // Success!
  console.log('🎉 All tests passed! Supabase is configured correctly.\n');
}

testSupabaseConnection().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
