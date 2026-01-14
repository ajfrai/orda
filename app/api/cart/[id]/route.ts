import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const supabase = getServiceRoleClient();

    // Fetch cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('id', cartId)
      .single();

    if (cartError) {
      return NextResponse.json(
        { error: 'Cart not found', details: cartError },
        { status: 404 }
      );
    }

    // Fetch menu with items (items are stored as JSONB in the menus table)
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', cart.menu_id)
      .single();

    if (menuError) {
      return NextResponse.json(
        { error: 'Menu not found', details: menuError },
        { status: 404 }
      );
    }

    // Fetch cart items
    const { data: cartItems, error: cartItemsError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .order('created_at', { ascending: true });

    if (cartItemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch cart items', details: cartItemsError },
        { status: 500 }
      );
    }

    // Transform the menu data to match our expected format
    const menuData = {
      id: menu.id,
      created_at: menu.created_at,
      pdf_url: menu.pdf_url,
      restaurant_name: menu.restaurant_name,
      location: {
        city: menu.location_city || 'Unknown',
        state: menu.location_state || 'Unknown',
      },
      tax_rate: menu.tax_rate,
      items: Array.isArray(menu.items) ? menu.items : [],
    };

    return NextResponse.json({
      cart,
      menu: menuData,
      cartItems: cartItems || [],
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch cart:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
