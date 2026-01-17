import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Validate request body
    const { user_name, item_name, item_price, is_price_estimate, quantity, notes } = body;

    if (!user_name || !item_name || typeof item_price !== 'number' || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: user_name, item_name, item_price, quantity' },
        { status: 400 }
      );
    }

    // Insert cart item
    const { data: cartItem, error: insertError } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        user_name,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const body = await request.json();
    const supabase = getServiceRoleClient();

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId parameter' },
        { status: 400 }
      );
    }

    // Validate request body - at least one field should be present
    const { quantity, notes } = body;

    if (quantity === undefined && notes === undefined) {
      return NextResponse.json(
        { error: 'At least one field (quantity or notes) must be provided' },
        { status: 400 }
      );
    }

    // Validate quantity if provided
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: { quantity?: number; notes?: string | null } = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (notes !== undefined) updateData.notes = notes || null;

    // Update the item
    const { data: updatedItem, error: updateError } = await supabase
      .from('cart_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('cart_id', cartId)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update cart item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update item', details: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('[ERROR] Update cart item:', error);
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
    const supabase = getServiceRoleClient();

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId parameter' },
        { status: 400 }
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('cart_id', cartId);

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
