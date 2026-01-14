/**
 * POST /api/parse-menu
 * Fetches PDF from URL, validates it, parses with Claude vision, creates menu + cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePdfUrl } from '@/lib/url-validator';
import { analyzeMenuPdf, analyzeMenuFromUpload } from '@/lib/claude';
import { getTaxRate } from '@/lib/tax-rates';
import { getServiceRoleClient } from '@/lib/supabase';
import type { ParseMenuRequest, ParseMenuResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let analysis;
    let sourceUrl: string | null = null;

    // Check if it's a file upload or URL
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Please upload a PDF or image file.' },
          { status: 400 }
        );
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File is too large. Maximum size is 10MB.' },
          { status: 400 }
        );
      }

      // Convert to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log('Analyzing uploaded file:', file.name, file.type);
      analysis = await analyzeMenuFromUpload(buffer, file.type);
    } else {
      // Handle URL
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

      console.log('Analyzing menu from URL:', validation.url?.toString());
      analysis = await analyzeMenuPdf(pdfUrl);
      sourceUrl = pdfUrl;
    }

    // Check if it's a valid menu
    if (!analysis.isMenu) {
      return NextResponse.json(
        { error: analysis.error || 'This file does not appear to be a restaurant menu.' },
        { status: 400 }
      );
    }

    // Ensure required fields exist
    if (!analysis.restaurantName || !analysis.categories || analysis.categories.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract menu information from file' },
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
        pdf_url: sourceUrl || null,
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
