import { createClient } from '@supabase/supabase-js';

// Environment variables validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// After validation, these are guaranteed to be strings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Client-side Supabase client
 * Use this in Client Components and browser-side code
 * Has Row Level Security (RLS) policies enforced
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client with service role key
 * Use this in Server Components, API routes, and Server Actions
 * BYPASSES Row Level Security - use with caution
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
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

  const cartResult = await client
    .from('carts')
    .select('*')
    .eq('id', cartId)
    .single();

  if (cartResult.error || !cartResult.data) {
    throw cartResult.error || new Error('Cart not found');
  }

  const cart = cartResult.data;

  const menuResult = await client
    .from('menus')
    .select('*')
    .eq('id', cart.menu_id)
    .single();

  if (menuResult.error || !menuResult.data) {
    throw menuResult.error || new Error('Menu not found');
  }

  const menu = menuResult.data;

  const itemsResult = await client
    .from('cart_items')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (itemsResult.error) throw itemsResult.error;

  return {
    cart,
    menu,
    items: itemsResult.data || [],
  };
}

/**
 * Subscribe to real-time changes for cart items
 * Use this in Client Components to get live updates
 */
export function subscribeToCartItems(
  cartId: string,
  callback: (items: any[]) => void
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
