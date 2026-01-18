import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

interface UpdateMenuRequest {
  tax_rate?: number;
  restaurant_name?: string;
  location_city?: string;
  location_state?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;
    const body: UpdateMenuRequest = await request.json();
    const supabase = getServiceRoleClient();

    // Build update object with only provided fields
    const updates: Partial<{
      tax_rate: number;
      restaurant_name: string;
      location_city: string;
      location_state: string;
    }> = {};

    // Validate and add tax_rate if provided
    if (body.tax_rate !== undefined) {
      if (typeof body.tax_rate !== 'number' || body.tax_rate < 0 || body.tax_rate > 1) {
        return NextResponse.json(
          { error: 'Invalid tax rate. Must be between 0 and 1 (e.g., 0.0863 for 8.63%).' },
          { status: 400 }
        );
      }
      updates.tax_rate = body.tax_rate;
    }

    // Add restaurant_name if provided
    if (body.restaurant_name !== undefined) {
      if (typeof body.restaurant_name !== 'string' || body.restaurant_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid restaurant name. Must be a non-empty string.' },
          { status: 400 }
        );
      }
      updates.restaurant_name = body.restaurant_name.trim();
    }

    // Add location_city if provided
    if (body.location_city !== undefined) {
      if (typeof body.location_city !== 'string') {
        return NextResponse.json(
          { error: 'Invalid city. Must be a string.' },
          { status: 400 }
        );
      }
      updates.location_city = body.location_city.trim();
    }

    // Add location_state if provided
    if (body.location_state !== undefined) {
      if (typeof body.location_state !== 'string') {
        return NextResponse.json(
          { error: 'Invalid state. Must be a string.' },
          { status: 400 }
        );
      }
      updates.location_state = body.location_state.trim();
    }

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update menu
    const { data: menu, error: updateError } = await supabase
      .from('menus')
      .update(updates)
      .eq('id', menuId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update menu', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('[ERROR] Failed to update menu:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
