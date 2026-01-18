/**
 * POST /api/parse-menu
 * Parses menu from uploaded file with Claude vision, creates menu + cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeMenuFromUpload, analyzeMenuWithProgress, type ProgressEvent } from '@/lib/claude';
import { getServiceRoleClient } from '@/lib/supabase';
import type { ParseMenuResponse } from '@/types';

interface FileData {
  base64: string;
  mediaType: string;
  isDocument: boolean;
}

/**
 * Upload file to Supabase Storage and return public URL
 */
async function uploadFileToStorage(buffer: Buffer, fileName: string, mimeType: string): Promise<string | null> {
  try {
    const supabase = getServiceRoleClient();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || 'pdf';
    const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('menu-uploads')
      .upload(uniqueFileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file to storage:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-uploads')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Exception during file upload:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const acceptHeader = request.headers.get('accept') || '';
    const useStreaming = acceptHeader.includes('text/event-stream');

    // If streaming is requested, use streaming endpoint
    if (useStreaming) {
      return handleStreamingRequest(request, contentType);
    }

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

    // Upload file to storage
    console.log('Uploading file to storage:', file.name, file.type);
    const pdfUrl = await uploadFileToStorage(buffer, file.name, file.type);

    console.log('Analyzing uploaded file:', file.name, file.type);
    const analysis = await analyzeMenuFromUpload(buffer, file.type);

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

    // Default tax rate to 0 - user will set it manually
    const taxRate = 0;
    console.log('Tax rate set to 0 (user will configure manually)');

    // Log analysis result for debugging
    console.log('[DEBUG] Analysis result:', JSON.stringify(analysis, null, 2));

    // Flatten categories into items array for storage
    const menuItems = analysis.categories.flatMap((category) =>
      category.items.map((item) => ({
        category: category.category,
        name: item.name,
        description: item.description || null,
        price: item.price || 0,
        is_estimate: item.isEstimate,
        chips: item.chips || [],
      }))
    );

    // Get Supabase service role client
    const supabase = getServiceRoleClient();

    // Log what we're about to insert
    console.log('[DEBUG] Inserting menu with items count:', menuItems.length);
    console.log('[DEBUG] First menu item sample:', JSON.stringify(menuItems[0], null, 2));

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
        {
          error: 'Failed to save menu data',
          details: {
            message: menuError.message,
            code: menuError.code,
            hint: menuError.hint,
            details: menuError.details,
            supabaseError: menuError,
            restaurantName: analysis.restaurantName,
            itemsCount: menuItems.length,
            sampleItem: menuItems[0],
          }
        },
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
        {
          error: 'Failed to create cart',
          details: {
            message: cartError.message,
            code: cartError.code,
            hint: cartError.hint,
            details: cartError.details,
            supabaseError: cartError,
            menuId: menu.id,
          }
        },
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

    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : { error: String(error) };

    return NextResponse.json(
      {
        error: 'An unexpected error occurred while processing the menu',
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming request with progress updates
 */
async function handleStreamingRequest(request: NextRequest, contentType: string) {
  const encoder = new TextEncoder();

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fileData: FileData;
        let existingCartId: string | null = null;

        // Helper to send SSE message
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;
        existingCartId = formData.get('cartId') as string | null;

        if (!file) {
          sendEvent('error', { error: 'No file provided' });
          controller.close();
          return;
        }

        // Validate file
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          sendEvent('error', { error: 'Invalid file type. Please upload a PDF or image file.' });
          controller.close();
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          sendEvent('error', { error: 'File is too large. Maximum size is 10MB.' });
          controller.close();
          return;
        }

        // Convert to FileData
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload file to storage
        sendEvent('status', { message: 'Uploading menu file...' });
        const pdfUrl = await uploadFileToStorage(buffer, file.name, file.type);

        fileData = {
          base64: buffer.toString('base64'),
          mediaType: file.type,
          isDocument: file.type === 'application/pdf',
        };

        // Track state for incremental menu creation
        let cartId: string | null = null;
        let menuId: string | null = null;
        let metadata: { restaurantName: string; location?: { city?: string; state?: string } } | null = null;
        const receivedItems: Array<any> = [];
        const supabase = getServiceRoleClient();

        // Analyze menu with progress updates
        const result = await analyzeMenuWithProgress(fileData, async (event: ProgressEvent) => {
          if (event.type === 'status') {
            sendEvent('status', { message: event.message });
          } else if (event.type === 'progress') {
            sendEvent('progress', { current: event.current, total: event.total });
          } else if (event.type === 'menu_extraction_end') {
            // Send end-of-stream indicator to client
            sendEvent('menu_extraction_end', { status: 'complete', type: 'menu_extraction_end' });
          } else if (event.type === 'metadata') {
            // Store metadata
            metadata = {
              restaurantName: event.restaurantName,
              location: event.location,
            };
            sendEvent('metadata', metadata);
          } else if (event.type === 'item') {
            // Received a new item - store it
            const menuItem = {
              category: event.category,
              name: event.item.name,
              description: event.item.description || null,
              price: event.item.price || 0,
              is_estimate: event.item.isEstimate,
              chips: event.item.chips || [],
            };
            receivedItems.push(menuItem);

            // Create menu and cart on first item (if we have metadata)
            if (!cartId && metadata && receivedItems.length === 1) {
              try {
                sendEvent('status', { message: 'Creating menu...' });

                // Default tax rate to 0 - user will set it manually
                const taxRate = 0;

                // Create menu with first item
                const { data: menu, error: menuError } = await supabase
                  .from('menus')
                  .insert({
                    pdf_url: pdfUrl,
                    restaurant_name: metadata.restaurantName,
                    location_city: metadata.location?.city || null,
                    location_state: metadata.location?.state || null,
                    tax_rate: taxRate,
                    items: [menuItem], // Start with first item
                  })
                  .select()
                  .single();

                if (menuError) {
                  console.error('Error creating menu:', menuError);
                  sendEvent('error', { error: 'Failed to create menu' });
                  return;
                }

                menuId = menu.id;

                // Use existing cart or create new one
                if (existingCartId) {
                  // Update existing cart with menu_id
                  const { error: updateError } = await supabase
                    .from('carts')
                    .update({ menu_id: menu.id })
                    .eq('id', existingCartId);

                  if (updateError) {
                    console.error('Error updating cart:', updateError);
                    sendEvent('error', { error: 'Failed to update cart' });
                    return;
                  }

                  cartId = existingCartId;
                } else {
                  // Create new cart
                  const { data: cart, error: cartError } = await supabase
                    .from('carts')
                    .insert({
                      menu_id: menu.id,
                      tip_percentage: 18,
                    })
                    .select()
                    .single();

                  if (cartError) {
                    console.error('Error creating cart:', cartError);
                    sendEvent('error', { error: 'Failed to create cart' });
                    return;
                  }

                  cartId = cart.id;

                  // Send firstItem event to trigger navigation (only for new carts)
                  sendEvent('firstItem', {
                    cartId: cart.id,
                    restaurantName: metadata.restaurantName,
                    item: event.item,
                  });
                }
              } catch (err) {
                console.error('Error in first item processing:', err);
                sendEvent('error', { error: 'Failed to create menu' });
                return;
              }
            } else if (cartId && menuId) {
              // Update menu with new item
              try {
                await supabase
                  .from('menus')
                  .update({
                    items: receivedItems,
                  })
                  .eq('id', menuId);
              } catch (err) {
                console.error('Error updating menu:', err);
                // Don't fail on update errors, continue streaming
              }
            }

            // Send the item to the client
            sendEvent('item', {
              item: event.item,
              category: event.category,
              cartId: cartId,
            });
          } else if (event.type === 'error') {
            sendEvent('error', { error: event.error });
          }
        });

        // Check if valid menu
        if (!result.isMenu) {
          sendEvent('error', { error: result.error || 'This file does not appear to be a restaurant menu.' });
          controller.close();
          return;
        }

        if (!result.restaurantName || !result.categories || result.categories.length === 0) {
          sendEvent('error', { error: 'Could not extract menu information from file' });
          controller.close();
          return;
        }

        // If cart was already created (streaming path), just update with final items
        if (cartId && menuId) {
          sendEvent('status', { message: 'Finalizing menu...' });

          // Make sure we have all items
          const allItems = result.categories.flatMap((category) =>
            category.items.map((item) => ({
              category: category.category,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              is_estimate: item.isEstimate,
              chips: item.chips || [],
            }))
          );

          // Final update with all items
          await supabase
            .from('menus')
            .update({ items: allItems })
            .eq('id', menuId);

          sendEvent('complete', {
            cartId: cartId,
            restaurantName: result.restaurantName,
          });
        } else {
          // Fallback: if cart wasn't created during streaming, create it now
          sendEvent('status', { message: 'Creating cart...' });

          // Default tax rate to 0 - user will set it manually
          const taxRate = 0;
          const menuItems = result.categories.flatMap((category) =>
            category.items.map((item) => ({
              category: category.category,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              is_estimate: item.isEstimate,
              chips: item.chips || [],
            }))
          );

          const { data: menu, error: menuError } = await supabase
            .from('menus')
            .insert({
              pdf_url: pdfUrl,
              restaurant_name: result.restaurantName,
              location_city: result.location?.city || null,
              location_state: result.location?.state || null,
              tax_rate: taxRate,
              items: menuItems,
            })
            .select()
            .single();

          if (menuError) {
            console.error('Error creating menu:', menuError);
            sendEvent('error', { error: 'Failed to save menu data' });
            controller.close();
            return;
          }

          const { data: cart, error: cartError } = await supabase
            .from('carts')
            .insert({
              menu_id: menu.id,
              tip_percentage: 18,
            })
            .select()
            .single();

          if (cartError) {
            console.error('Error creating cart:', cartError);
            sendEvent('error', { error: 'Failed to create cart' });
            controller.close();
            return;
          }

          sendEvent('complete', {
            cartId: cart.id,
            restaurantName: menu.restaurant_name,
          });
        }

        controller.close();
      } catch (error) {
        console.error('Error in streaming request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        const errorDetails = error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : { error: String(error) };

        const message = `event: error\ndata: ${JSON.stringify({
          error: errorMessage,
          details: errorDetails
        })}\n\n`;
        controller.enqueue(encoder.encode(message));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
