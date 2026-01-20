/**
 * Claude API wrapper for menu parsing with PDF vision support
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MenuAnalysisResult {
  isMenu: boolean;
  restaurantName?: string;
  location?: {
    city?: string;
    state?: string;
  };
  categories?: MenuCategory[];
  error?: string;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: number;
  isEstimate: boolean;
  chips?: string[];
  regionalTag?: string;
  regionalDescription?: string;
}

interface FileData {
  base64: string;
  mediaType: string;
  isDocument: boolean; // true for PDF, false for images
}

/**
 * Fetch file (PDF or image) from URL and return as base64 with media type
 */
async function fetchFileAsBase64(url: string): Promise<FileData> {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Orda-Menu-Parser/1.0',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  } catch (fetchError) {
    // Network/fetch error
    const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';

    if (errorMsg.includes('aborted')) {
      throw new Error(`Request timeout: The file took too long to download (30s limit). The file may be too large or the server is slow.`);
    }

    throw new Error(`Failed to fetch file from URL: ${errorMsg}. This could be due to: network issues, CORS restrictions, DNS resolution failure, or the server blocking the request.`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file: HTTP ${response.status} ${response.statusText}. The file may be protected, moved, or not publicly accessible.`);
  }

  // Check file size (10MB limit)
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    throw new Error('File is too large (max 10MB)');
  }

  // Detect content type
  const contentType = response.headers.get('content-type') || '';
  let mediaType = contentType;
  let isDocument = false;

  // Map content types
  if (contentType.includes('pdf')) {
    mediaType = 'application/pdf';
    isDocument = true;
  } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    mediaType = 'image/jpeg';
  } else if (contentType.includes('png')) {
    mediaType = 'image/png';
  } else if (contentType.includes('gif')) {
    mediaType = 'image/gif';
  } else if (contentType.includes('webp')) {
    mediaType = 'image/webp';
  } else {
    // Fallback: detect from URL extension
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.pdf')) {
      mediaType = 'application/pdf';
      isDocument = true;
    } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
      mediaType = 'image/jpeg';
    } else if (urlLower.includes('.png')) {
      mediaType = 'image/png';
    } else if (urlLower.includes('.gif')) {
      mediaType = 'image/gif';
    } else if (urlLower.includes('.webp')) {
      mediaType = 'image/webp';
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    base64: buffer.toString('base64'),
    mediaType,
    isDocument,
  };
}

/**
 * Core function to analyze menu data with Claude
 */
async function analyzeMenuWithClaude(fileData: FileData): Promise<MenuAnalysisResult> {
  let jsonText = ''; // Declare outside try to access in catch
  try {
    // Build content array based on file type
    const contentArray: any[] = fileData.isDocument
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: fileData.mediaType,
              data: fileData.base64,
            },
          },
        ]
      : [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: fileData.mediaType,
              data: fileData.base64,
            },
          },
        ];

    // Add text prompt
    contentArray.push({
      type: 'text',
      text: `Please analyze this ${fileData.isDocument ? 'PDF' : 'image'} and determine if it's a restaurant menu.

If it IS a restaurant menu, respond with a STREAM of individual JSON objects, one per line:

First, output the metadata:
{"type": "metadata", "restaurantName": "Name", "location": {"city": "City", "state": "ST"}}

Then, output each menu item as a separate JSON object with a "chips" array for dietary/attribute tags and regional specialties:
{"type": "item", "category": "Appetizers", "name": "Wings", "description": "Crispy wings", "price": 12.99, "isEstimate": false, "chips": ["Spicy"]}
{"type": "item", "category": "Appetizers", "name": "Nachos", "description": "Loaded nachos", "price": 10.99, "isEstimate": false, "chips": ["Vegetarian"]}
{"type": "item", "category": "Entrees", "name": "Mole Negro", "description": "Traditional Oaxacan black mole", "price": 18.99, "isEstimate": false, "chips": ["Oaxacan"]}
{"type": "item", "category": "Entrees", "name": "Salad", "description": "Fresh garden salad", "price": 8.99, "isEstimate": false, "chips": ["Vegan", "Gluten Free"]}

Finally, output a completion marker when all menu items are extracted:
{"status": "complete", "type": "menu_extraction_end"}

CHIPS (include all that apply as strings in the chips array):

DIETARY ATTRIBUTES:
- "Spicy" - for items marked with chili peppers or described as spicy/hot
- "Vegetarian" - for items with no meat/fish (but may include dairy/eggs)
- "Vegan" - for items with no animal products
- "Gluten Free" - for items marked as gluten-free or naturally gluten-free
- "Kosher" - for items marked with kosher symbols (K, OU, etc.)
- "Dairy Free" - for items without dairy products
- "Nut Free" - for items without nuts
- Any other relevant dietary tags you find on the menu

REGIONAL SPECIALTIES (IMPORTANT):
- Identify dishes with strong regional authenticity tied to a specific city, region, or culinary tradition
- Add the regional identifier as a chip (e.g., "Oaxacan", "Hyderabadi", "Neapolitan", "Sichuan", "Lima Icon")
- Only tag items prepared in traditional/authentic style, NOT fusion or heavily adapted versions
- Do NOT use generic marketing terms like "Chef's Special" or "Authentic" - be specific
- Examples: "Oaxacan" (for mole negro), "Hyderabadi" (for dum biryani), "Lima Icon" (for ceviche), "Sichuan" (for mapo tofu), "Neapolitan" (for margherita pizza)

If an item has no special attributes, use an empty array: "chips": []

If prices are missing or unclear, estimate them based on the type of restaurant and dish, and set "isEstimate": true.
If the city/state is not on the menu, try to infer from restaurant name or other context clues, otherwise omit.

If it is NOT a restaurant menu, respond with:
{"type": "error", "message": "This does not appear to be a restaurant menu."}

CRITICAL:
- Output ONE JSON object per line
- Each JSON object must be complete and valid
- No markdown code blocks, no extra text
- Start streaming items immediately after metadata`,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
    });

    // Parse Claude's response (line-by-line JSON format)
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    jsonText = textContent.text.trim();

    // Parse line-by-line JSON objects
    const lines = jsonText.split('\n');
    let restaurantName: string | undefined;
    let location: { city?: string; state?: string } | undefined;
    const categoriesMap: Map<string, MenuItem[]> = new Map();

    for (const line of lines) {
      const obj = parseStreamingJsonLine(line);
      if (!obj) continue;

      if (obj.type === 'metadata') {
        restaurantName = obj.restaurantName;
        location = obj.location;
      } else if (obj.type === 'item') {
        if (!categoriesMap.has(obj.category)) {
          categoriesMap.set(obj.category, []);
        }
        categoriesMap.get(obj.category)!.push({
          name: obj.name,
          description: obj.description,
          price: obj.price,
          isEstimate: obj.isEstimate,
          chips: obj.chips || [],
        });
      } else if (obj.type === 'error') {
        return { isMenu: false, error: obj.message };
      }
    }

    if (!restaurantName) {
      throw new Error('No metadata received from Claude');
    }

    // Convert map to categories array
    const categories: MenuCategory[] = Array.from(categoriesMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));

    const result: MenuAnalysisResult = {
      isMenu: true,
      restaurantName,
      location,
      categories,
    };

    console.log('[DEBUG] Claude analysis complete');
    console.log('[DEBUG] Restaurant:', result.restaurantName);
    console.log('[DEBUG] Categories:', result.categories?.length);

    return result;
  } catch (error) {
    console.error('Error analyzing menu PDF:', error);
    console.error('[DEBUG] Raw response text:', jsonText);

    if (error instanceof Error) {
      return {
        isMenu: false,
        error: error.message,
      };
    }

    return {
      isMenu: false,
      error: 'Failed to analyze menu',
    };
  }
}

/**
 * Analyze a menu from URL (PDF or image)
 * @param fileUrl - URL to the menu file
 * @returns Menu analysis result
 */
export async function analyzeMenuPdf(fileUrl: string): Promise<MenuAnalysisResult> {
  try {
    const fileData = await fetchFileAsBase64(fileUrl);
    return await analyzeMenuWithClaude(fileData);
  } catch (error) {
    console.error('Error fetching menu from URL:', error);
    if (error instanceof Error) {
      return { isMenu: false, error: error.message };
    }
    return { isMenu: false, error: 'Failed to fetch menu from URL' };
  }
}

/**
 * Analyze a menu from uploaded file
 * @param buffer - File buffer
 * @param mimeType - MIME type of the file
 * @returns Menu analysis result
 */
export async function analyzeMenuFromUpload(
  buffer: Buffer,
  mimeType: string
): Promise<MenuAnalysisResult> {
  try {
    // Determine if it's a document or image
    let mediaType = mimeType;
    let isDocument = false;

    if (mimeType === 'application/pdf') {
      isDocument = true;
    } else if (mimeType.startsWith('image/')) {
      mediaType = mimeType;
    } else {
      throw new Error('Unsupported file type');
    }

    const fileData: FileData = {
      base64: buffer.toString('base64'),
      mediaType,
      isDocument,
    };

    return await analyzeMenuWithClaude(fileData);
  } catch (error) {
    console.error('Error analyzing uploaded menu:', error);
    if (error instanceof Error) {
      return { isMenu: false, error: error.message };
    }
    return { isMenu: false, error: 'Failed to analyze uploaded file' };
  }
}

/**
 * Progress event types for streaming
 */
export type ProgressEvent =
  | { type: 'status'; message: string }
  | { type: 'progress'; current: number; total: number }
  | { type: 'metadata'; restaurantName: string; location?: { city?: string; state?: string } }
  | { type: 'item'; item: MenuItem; category: string }
  | { type: 'menu_extraction_end' }
  | { type: 'complete'; result: MenuAnalysisResult }
  | { type: 'error'; error: string };

/**
 * Parse streaming JSON objects line-by-line
 * Each line should be a complete JSON object
 */
function parseStreamingJsonLine(line: string): any | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.error('[DEBUG] Failed to parse JSON line:', trimmed);
    return null;
  }
}

/**
 * Streaming version - analyze menu with progress updates
 * Supports multiple files (pages) in a single request
 * @param fileData - Single file data or array of file data to analyze
 * @param onProgress - Callback for progress updates
 * @returns Menu analysis result
 */
export async function analyzeMenuWithProgress(
  fileData: FileData | FileData[],
  onProgress: (event: ProgressEvent) => void
): Promise<MenuAnalysisResult> {
  try {
    const filesArray = Array.isArray(fileData) ? fileData : [fileData];
    const pageCount = filesArray.length;

    onProgress({ type: 'status', message: `Preparing menu analysis (${pageCount} ${pageCount === 1 ? 'page' : 'pages'})...` });

    // Build content array with all files
    const contentArray: any[] = [];

    filesArray.forEach((file, index) => {
      if (file.isDocument) {
        contentArray.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: file.mediaType,
            data: file.base64,
          },
        });
      } else {
        contentArray.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.mediaType,
            data: file.base64,
          },
        });
      }
    });

    const fileDescription = pageCount === 1
      ? (filesArray[0].isDocument ? 'PDF' : 'image')
      : `${pageCount} menu pages/images`;

    contentArray.push({
      type: 'text',
      text: `Please analyze this ${fileDescription} and determine if it's a restaurant menu.${pageCount > 1 ? ' These are multiple pages from the same menu - combine all items into a unified menu, merging duplicate categories.' : ''}

If it IS a restaurant menu, respond with a STREAM of individual JSON objects, one per line:

First, output the metadata:
{"type": "metadata", "restaurantName": "Name", "location": {"city": "City", "state": "ST"}}

Then, output each menu item as a separate JSON object with a "chips" array for dietary/attribute tags and regional specialties:
{"type": "item", "category": "Appetizers", "name": "Wings", "description": "Crispy wings", "price": 12.99, "isEstimate": false, "chips": ["Spicy"]}
{"type": "item", "category": "Appetizers", "name": "Nachos", "description": "Loaded nachos", "price": 10.99, "isEstimate": false, "chips": ["Vegetarian"]}
{"type": "item", "category": "Entrees", "name": "Mole Negro", "description": "Traditional Oaxacan black mole", "price": 18.99, "isEstimate": false, "chips": ["Oaxacan"]}
{"type": "item", "category": "Entrees", "name": "Salad", "description": "Fresh garden salad", "price": 8.99, "isEstimate": false, "chips": ["Vegan", "Gluten Free"]}

Finally, output a completion marker when all menu items are extracted:
{"status": "complete", "type": "menu_extraction_end"}

CHIPS (include all that apply as strings in the chips array):

DIETARY ATTRIBUTES:
- "Spicy" - for items marked with chili peppers or described as spicy/hot
- "Vegetarian" - for items with no meat/fish (but may include dairy/eggs)
- "Vegan" - for items with no animal products
- "Gluten Free" - for items marked as gluten-free or naturally gluten-free
- "Kosher" - for items marked with kosher symbols (K, OU, etc.)
- "Dairy Free" - for items without dairy products
- "Nut Free" - for items without nuts
- Any other relevant dietary tags you find on the menu

REGIONAL SPECIALTIES (IMPORTANT):
- Identify dishes with strong regional authenticity tied to a specific city, region, or culinary tradition
- Add the regional identifier as a chip (e.g., "Oaxacan", "Hyderabadi", "Neapolitan", "Sichuan", "Lima Icon")
- Only tag items prepared in traditional/authentic style, NOT fusion or heavily adapted versions
- Do NOT use generic marketing terms like "Chef's Special" or "Authentic" - be specific
- Examples: "Oaxacan" (for mole negro), "Hyderabadi" (for dum biryani), "Lima Icon" (for ceviche), "Sichuan" (for mapo tofu), "Neapolitan" (for margherita pizza)

If an item has no special attributes, use an empty array: "chips": []

If prices are missing or unclear, estimate them based on the type of restaurant and dish, and set "isEstimate": true.
If the city/state is not on the menu, try to infer from restaurant name or other context clues, otherwise omit.

If it is NOT a restaurant menu, respond with:
{"type": "error", "message": "This does not appear to be a restaurant menu."}

CRITICAL:
- Output ONE JSON object per line
- Each JSON object must be complete and valid
- No markdown code blocks, no extra text
- Start streaming items immediately after metadata`,
    });

    onProgress({ type: 'status', message: 'Sending to Claude AI...' });

    // Call Claude API with streaming
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
    });

    let accumulatedText = '';
    let lineBuffer = '';
    let tokenCount = 0;

    onProgress({ type: 'status', message: 'Analyzing menu...' });

    // Process stream
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        accumulatedText += chunk.delta.text;
        lineBuffer += chunk.delta.text;
        tokenCount += 1;

        // Send progress update every 50 tokens
        if (tokenCount % 50 === 0) {
          onProgress({
            type: 'progress',
            current: tokenCount,
            total: 4096, // max_tokens
          });
        }

        // Check for complete lines (JSON objects)
        const lines = lineBuffer.split('\n');

        // Keep the last incomplete line in the buffer
        if (lines.length > 1) {
          lineBuffer = lines.pop() || '';

          // Process each complete line
          for (const line of lines) {
            const obj = parseStreamingJsonLine(line);
            if (!obj) continue;

            if (obj.type === 'metadata') {
              onProgress({
                type: 'metadata',
                restaurantName: obj.restaurantName,
                location: obj.location,
              });
            } else if (obj.type === 'item') {
              const menuItem = {
                name: obj.name,
                description: obj.description,
                price: obj.price,
                isEstimate: obj.isEstimate,
                chips: obj.chips || [],
              };

              // Console log each streamed menu item
              console.log(`[${new Date().toISOString()}] Streamed menu item:`, {
                name: menuItem.name,
                category: obj.category,
                price: menuItem.price,
                isEstimate: menuItem.isEstimate,
                chips: menuItem.chips,
              });

              onProgress({
                type: 'item',
                item: menuItem,
                category: obj.category,
              });
            } else if (obj.type === 'menu_extraction_end' && obj.status === 'complete') {
              // End-of-stream indicator - log completion and notify
              console.log(`[${new Date().toISOString()}] Menu extraction complete - end-of-stream received`);
              onProgress({ type: 'menu_extraction_end' });
            } else if (obj.type === 'error') {
              throw new Error(obj.message);
            }
          }
        }
      }
    }

    // Process any remaining line in buffer
    if (lineBuffer.trim()) {
      const obj = parseStreamingJsonLine(lineBuffer);
      if (obj) {
        if (obj.type === 'item') {
          onProgress({
            type: 'item',
            item: {
              name: obj.name,
              description: obj.description,
              price: obj.price,
              isEstimate: obj.isEstimate,
              chips: obj.chips || [],
            },
            category: obj.category,
          });
        } else if (obj.type === 'error') {
          throw new Error(obj.message);
        }
      }
    }

    onProgress({ type: 'status', message: 'Finalizing results...' });

    // Parse the accumulated response line-by-line to build final result
    const lines = accumulatedText.trim().split('\n');
    let restaurantName: string | undefined;
    let location: { city?: string; state?: string } | undefined;
    const categoriesMap: Map<string, MenuItem[]> = new Map();

    for (const line of lines) {
      const obj = parseStreamingJsonLine(line);
      if (!obj) continue;

      if (obj.type === 'metadata') {
        restaurantName = obj.restaurantName;
        location = obj.location;
      } else if (obj.type === 'item') {
        if (!categoriesMap.has(obj.category)) {
          categoriesMap.set(obj.category, []);
        }
        categoriesMap.get(obj.category)!.push({
          name: obj.name,
          description: obj.description,
          price: obj.price,
          isEstimate: obj.isEstimate,
          chips: obj.chips || [],
        });
      } else if (obj.type === 'error') {
        throw new Error(obj.message);
      }
    }

    if (!restaurantName) {
      throw new Error('No metadata received from Claude');
    }

    // Convert map to categories array
    const categories: MenuCategory[] = Array.from(categoriesMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));

    const result: MenuAnalysisResult = {
      isMenu: true,
      restaurantName,
      location,
      categories,
    };

    console.log('[DEBUG] Claude streaming analysis complete');
    console.log('[DEBUG] Restaurant:', result.restaurantName);
    console.log('[DEBUG] Categories:', result.categories?.length);

    onProgress({ type: 'complete', result });

    return result;
  } catch (error) {
    console.error('Error analyzing menu with progress:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze menu';
    onProgress({ type: 'error', error: errorMessage });

    if (error instanceof Error) {
      return { isMenu: false, error: error.message };
    }

    return { isMenu: false, error: 'Failed to analyze menu' };
  }
}
