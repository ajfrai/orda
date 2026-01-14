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
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isKosher?: boolean;
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

If it IS a restaurant menu, extract the following information and respond with valid JSON:
{
  "isMenu": true,
  "restaurantName": "Name of the restaurant",
  "location": {
    "city": "City name (if available)",
    "state": "State abbreviation (e.g. CA, NY, TX)"
  },
  "categories": [
    {
      "category": "Category name (e.g. Appetizers, Entrees, Desserts)",
      "items": [
        {
          "name": "Item name",
          "description": "Brief description (optional)",
          "price": 12.99,
          "isEstimate": false,
          "isSpicy": false,
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": false,
          "isKosher": false
        }
      ]
    }
  ]
}

DIETARY INDICATORS:
- Set isSpicy: true for items marked with chili peppers 🌶️ or described as spicy/hot
- Set isVegetarian: true for items with no meat/fish (but may include dairy/eggs)
- Set isVegan: true for items with no animal products (stricter than vegetarian)
- Set isGlutenFree: true for items marked as gluten-free or naturally gluten-free
- Set isKosher: true for items marked with kosher symbols (K, OU, etc.)
- If a dietary property isn't explicitly indicated, set it to false or omit it

If prices are missing or unclear, estimate them based on the type of restaurant and dish, and set "isEstimate": true.
If the city/state is not on the menu, try to infer from restaurant name or other context clues, otherwise omit.

If it is NOT a restaurant menu, respond with:
{
  "isMenu": false,
  "error": "This PDF does not appear to be a restaurant menu."
}

IMPORTANT:
- Respond with ONLY the JSON object, no other text
- Ensure all strings are properly escaped (use \\" for quotes within strings, \\n for newlines)
- The JSON must be valid and parseable`,
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

    // Parse Claude's response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (handle potential markdown code blocks)
    jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to parse JSON with better error handling
    let result: MenuAnalysisResult;
    try {
      result = JSON.parse(jsonText) as MenuAnalysisResult;
    } catch (parseError) {
      // If JSON parsing fails, provide detailed error info
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('[DEBUG] JSON parse failed:', errorMsg);
      console.error('[DEBUG] Problematic JSON text (first 500 chars):', jsonText.substring(0, 500));
      console.error('[DEBUG] Problematic JSON text (last 500 chars):', jsonText.substring(Math.max(0, jsonText.length - 500)));

      throw new Error(`JSON parsing failed: ${errorMsg}. This may be due to malformed JSON in Claude's response. Check the debug logs for the raw response.`);
    }

    console.log('[DEBUG] Claude analysis complete, isMenu:', result.isMenu);
    if (result.isMenu) {
      console.log('[DEBUG] Restaurant:', result.restaurantName);
      console.log('[DEBUG] Categories:', result.categories?.length);
    }

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
  | { type: 'complete'; result: MenuAnalysisResult }
  | { type: 'error'; error: string };

/**
 * Helper function to try extracting data from incomplete JSON
 * Returns metadata and new items that haven't been emitted yet
 */
function tryExtractData(
  jsonText: string,
  alreadyEmittedCount: number
): {
  metadata?: { restaurantName: string; location?: { city?: string; state?: string } };
  items: Array<{ item: MenuItem; category: string }>;
} {
  try {
    // Clean up markdown code blocks if present
    let cleanedText = jsonText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '');
    }

    // Try to parse as-is first
    let parsed: Partial<MenuAnalysisResult>;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      // If parsing fails, return empty
      return { items: [] };
    }

    // Extract metadata
    let metadata: { restaurantName: string; location?: { city?: string; state?: string } } | undefined;
    if (parsed.restaurantName) {
      metadata = {
        restaurantName: parsed.restaurantName,
        location: parsed.location,
      };
    }

    // Extract items from categories
    const allItems: Array<{ item: MenuItem; category: string }> = [];
    if (parsed.categories && Array.isArray(parsed.categories)) {
      for (const category of parsed.categories) {
        if (!category.items || !Array.isArray(category.items)) {
          continue;
        }
        for (const item of category.items) {
          allItems.push({ item, category: category.category });
        }
      }
    }

    // Return metadata and only new items
    return {
      metadata,
      items: allItems.slice(alreadyEmittedCount),
    };
  } catch (error) {
    // Silently fail - we'll try again on next chunk
    return { items: [] };
  }
}

/**
 * Streaming version - analyze menu with progress updates
 * @param fileData - File data to analyze
 * @param onProgress - Callback for progress updates
 * @returns Menu analysis result
 */
export async function analyzeMenuWithProgress(
  fileData: FileData,
  onProgress: (event: ProgressEvent) => void
): Promise<MenuAnalysisResult> {
  try {
    onProgress({ type: 'status', message: 'Preparing menu analysis...' });

    // Build content array
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

    contentArray.push({
      type: 'text',
      text: `Please analyze this ${fileData.isDocument ? 'PDF' : 'image'} and determine if it's a restaurant menu.

If it IS a restaurant menu, extract the following information and respond with valid JSON:
{
  "isMenu": true,
  "restaurantName": "Name of the restaurant",
  "location": {
    "city": "City name (if available)",
    "state": "State abbreviation (e.g. CA, NY, TX)"
  },
  "categories": [
    {
      "category": "Category name (e.g. Appetizers, Entrees, Desserts)",
      "items": [
        {
          "name": "Item name",
          "description": "Brief description (optional)",
          "price": 12.99,
          "isEstimate": false,
          "isSpicy": false,
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": false,
          "isKosher": false
        }
      ]
    }
  ]
}

DIETARY INDICATORS:
- Set isSpicy: true for items marked with chili peppers 🌶️ or described as spicy/hot
- Set isVegetarian: true for items with no meat/fish (but may include dairy/eggs)
- Set isVegan: true for items with no animal products (stricter than vegetarian)
- Set isGlutenFree: true for items marked as gluten-free or naturally gluten-free
- Set isKosher: true for items marked with kosher symbols (K, OU, etc.)
- If a dietary property isn't explicitly indicated, set it to false or omit it

If prices are missing or unclear, estimate them based on the type of restaurant and dish, and set "isEstimate": true.
If the city/state is not on the menu, try to infer from restaurant name or other context clues, otherwise omit.

If it is NOT a restaurant menu, respond with:
{
  "isMenu": false,
  "error": "This PDF does not appear to be a restaurant menu."
}

IMPORTANT:
- Respond with ONLY the JSON object, no other text
- Ensure all strings are properly escaped (use \\" for quotes within strings, \\n for newlines)
- The JSON must be valid and parseable`,
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
    let tokenCount = 0;
    let emittedItemCount = 0;
    let metadataEmitted = false;

    onProgress({ type: 'status', message: 'Analyzing menu...' });

    // Process stream
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        accumulatedText += chunk.delta.text;
        tokenCount += 1;

        // Try to parse and emit data every 50 tokens
        if (tokenCount % 50 === 0) {
          onProgress({
            type: 'progress',
            current: tokenCount,
            total: 4096, // max_tokens
          });

          // Try to parse incomplete JSON and extract data
          const extracted = tryExtractData(accumulatedText, emittedItemCount);

          // Emit metadata once when available
          if (!metadataEmitted && extracted.metadata) {
            onProgress({
              type: 'metadata',
              restaurantName: extracted.metadata.restaurantName,
              location: extracted.metadata.location,
            });
            metadataEmitted = true;
          }

          // Emit new items
          for (const { item, category } of extracted.items) {
            onProgress({ type: 'item', item, category });
            emittedItemCount++;
          }
        }
      }
    }

    onProgress({ type: 'status', message: 'Parsing results...' });

    // Parse the accumulated response
    let jsonText = accumulatedText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to parse JSON with better error handling
    let result: MenuAnalysisResult;
    try {
      result = JSON.parse(jsonText) as MenuAnalysisResult;
    } catch (parseError) {
      // If JSON parsing fails, provide detailed error info
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('[DEBUG] JSON parse failed:', errorMsg);
      console.error('[DEBUG] Problematic JSON text (first 500 chars):', jsonText.substring(0, 500));
      console.error('[DEBUG] Problematic JSON text (last 500 chars):', jsonText.substring(Math.max(0, jsonText.length - 500)));

      throw new Error(`JSON parsing failed: ${errorMsg}. This may be due to malformed JSON in Claude's response. Check the debug logs for the raw response.`);
    }

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
