import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();

    // Create an empty cart with default settings
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .insert({
        tip_percentage: 18,
      })
      .select()
      .single();

    if (cartError) {
      console.error('[ERROR] Failed to create cart:', cartError);
      return NextResponse.json({ error: 'Failed to create cart' }, { status: 500 });
    }

    return NextResponse.json({ cartId: cart.id });
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
