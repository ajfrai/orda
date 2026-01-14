/**
 * POST /api/parse-menu
 * Fetches PDF from URL, validates it, parses with Claude vision, creates menu + cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePdfUrl } from '@/lib/url-validator';
import { analyzeMenuPdf } from '@/lib/claude';
import { getTaxRate } from '@/lib/tax-rates';
import { getServiceRoleClient } from '@/lib/supabase';
import type { ParseMenuRequest, ParseMenuResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ParseMenuRequest = await request.json();
    const { pdfUrl } = body;

    // Validate URL
    const validation = validatePdfUrl(pdfUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Analyze PDF with Claude
    console.log('Analyzing PDF:', validation.url?.toString());
    const analysis = await analyzeMenuPdf(pdfUrl);

    // Check if it's a valid menu
    if (!analysis.isMenu) {
      return NextResponse.json(
        { error: analysis.error || 'This PDF does not appear to be a restaurant menu.' },
        { status: 400 }
      );
    }

    // Ensure required fields exist
    if (!analysis.restaurantName || !analysis.categories || analysis.categories.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract menu information from PDF' },
        { status: 400 }
      );
    }

    // Get tax rate based on location
    const taxRate = getTaxRate(analysis.location?.state);
    console.log(`Tax rate for ${analysis.location?.state || 'unknown'}: ${taxRate}`);

    // Flatten categories into items array for storage
    const menuItems = analysis.categories.flatMap((category) =>
      category.items.map((item) => ({
        category: category.category,
        name: item.name,
        description: item.description || null,
        price: item.price || 0,
        is_estimate: item.isEstimate,
      }))
    );

    // Get Supabase service role client
    const supabase = getServiceRoleClient();

    // Create menu record in Supabase
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert({
        pdf_url: pdfUrl,
        restaurant_name: analysis.restaurantName,
        location_city: analysis.location?.city || null,
        location_state: analysis.location?.state || null,
        tax_rate: taxRate,
        items: menuItems,
      })
      .select()
      .single();

    if (menuError) {
      console.error('Error creating menu:', menuError);
      return NextResponse.json(
        { error: 'Failed to save menu data' },
        { status: 500 }
      );
    }

    // Create cart record linked to menu
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .insert({
        menu_id: menu.id,
        tip_percentage: 18, // Default 18%
      })
      .select()
      .single();

    if (cartError) {
      console.error('Error creating cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to create cart' },
        { status: 500 }
      );
    }

    // Return success response
    const response: ParseMenuResponse = {
      cartId: cart.id,
      restaurantName: menu.restaurant_name,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in parse-menu:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the menu' },
      { status: 500 }
    );
  }
}
