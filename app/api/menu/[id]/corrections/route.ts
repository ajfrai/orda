import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

interface RecordCorrectionRequest {
  item_category: string;
  item_name_original: string;
  field_corrected: 'name' | 'description' | 'price' | 'category' | 'chips';
  original_value: string;
  corrected_value: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;
    const body: RecordCorrectionRequest = await request.json();
    const supabase = getServiceRoleClient();

    // Validate required fields
    if (!body.item_category || !body.item_name_original || !body.field_corrected) {
      return NextResponse.json(
        { error: 'Missing required fields: item_category, item_name_original, field_corrected' },
        { status: 400 }
      );
    }

    // Record the correction
    const { data: correction, error: insertError } = await supabase
      .from('menu_corrections')
      .insert({
        menu_id: menuId,
        item_category: body.item_category,
        item_name_original: body.item_name_original,
        field_corrected: body.field_corrected,
        original_value: body.original_value,
        corrected_value: body.corrected_value,
        notes: body.notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ERROR] Failed to record correction:', insertError);
      return NextResponse.json(
        { error: 'Failed to record correction', details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json(correction);
  } catch (error) {
    console.error('[ERROR] Failed to record correction:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
