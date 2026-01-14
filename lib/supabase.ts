import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

/**
 * Client-side Supabase client
 * Use this in Client Components and browser-side code
 * Has Row Level Security (RLS) policies enforced
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client with service role key
 * Use this in Server Components, API routes, and Server Actions
 * BYPASSES Row Level Security - use with caution
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to get a cart with all related data
 */
export async function getCartWithData(cartId: string) {
  const client = getServiceRoleClient();

  const { data: cart, error: cartError } = await client
    .from('carts')
    .select('*')
    .eq('id', cartId)
    .single();

  if (cartError) throw cartError;
  if (!cart) throw new Error('Cart not found');

  const { data: menu, error: menuError } = await client
    .from('menus')
    .select('*')
    .eq('id', cart.menu_id)
    .single();

  if (menuError) throw menuError;
  if (!menu) throw new Error('Menu not found');

  const { data: items, error: itemsError } = await client
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    cart,
    menu,
    items: items || [],
  };
}

/**
 * Subscribe to real-time changes for cart items
 * Use this in Client Components to get live updates
 */
export function subscribeToCartItems(
  cartId: string,
  callback: (items: Database['public']['Tables']['cart_items']['Row'][]) => void
) {
  const channel = supabase
    .channel(`cart_items:${cartId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `cart_id=eq.${cartId}`,
      },
      async () => {
        // Fetch all items when any change occurs
        const { data } = await supabase
          .from('cart_items')
          .select('*')
          .eq('cart_id', cartId)
          .order('created_at', { ascending: true });

        if (data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return channel;
}
