import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const body = await request.json();

    // Get the authenticated user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - no auth header' },
        { status: 401 }
      );
    }

    // Verify the session token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    // Get user's display name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.display_name || user.email?.split('@')[0] || 'Unknown';

    // Validate request body
    const { item_name, item_price, is_price_estimate, quantity, notes } = body;

    if (!item_name || typeof item_price !== 'number' || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: item_name, item_price, quantity' },
        { status: 400 }
      );
    }

    // Insert cart item
    const { data: cartItem, error: insertError } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        user_id: user.id,
        user_name: displayName,
        item_name,
        item_price,
        is_price_estimate: is_price_estimate || false,
        quantity,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ERROR] Failed to insert cart item:', insertError);
      return NextResponse.json(
        { error: 'Failed to add item to cart', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error('[ERROR] Add cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId parameter' },
        { status: 400 }
      );
    }

    // Get the authenticated user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the item (RLS policy will ensure user can only delete their own items)
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('cart_id', cartId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[ERROR] Failed to delete cart item:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete item', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Delete cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
