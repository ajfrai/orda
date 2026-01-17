import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { MenuItem } from '@/types';

interface UpdateMenuItemsRequest {
  items: MenuItem[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;
    const body: UpdateMenuItemsRequest = await request.json();
    const supabase = getServiceRoleClient();

    // Validate items array
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Invalid request. Items must be an array.' },
        { status: 400 }
      );
    }

    // Update menu items
    const { data: menu, error: updateError } = await supabase
      .from('menus')
      .update({ items: body.items })
      .eq('id', menuId)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update menu items:', updateError);
      return NextResponse.json(
        { error: 'Failed to update menu items', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('[ERROR] Failed to update menu items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
