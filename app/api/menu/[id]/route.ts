import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

interface UpdateTaxRateRequest {
  tax_rate: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;
    const body: UpdateTaxRateRequest = await request.json();
    const supabase = getServiceRoleClient();

    // Validate tax_rate
    if (typeof body.tax_rate !== 'number' || body.tax_rate < 0 || body.tax_rate > 1) {
      return NextResponse.json(
        { error: 'Invalid tax rate. Must be between 0 and 1 (e.g., 0.0863 for 8.63%).' },
        { status: 400 }
      );
    }

    // Update menu
    const { data: menu, error: updateError } = await supabase
      .from('menus')
      .update({ tax_rate: body.tax_rate })
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
