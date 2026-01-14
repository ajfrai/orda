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
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Orda-Menu-Parser/1.0',
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
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
          "isEstimate": false
        }
      ]
    }
  ]
}

If prices are missing or unclear, estimate them based on the type of restaurant and dish, and set "isEstimate": true.
If the city/state is not on the menu, try to infer from restaurant name or other context clues, otherwise omit.

If it is NOT a restaurant menu, respond with:
{
  "isMenu": false,
  "error": "This PDF does not appear to be a restaurant menu."
}

IMPORTANT: Respond with ONLY the JSON object, no other text.`,
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
    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const result = JSON.parse(jsonText) as MenuAnalysisResult;

    return result;
  } catch (error) {
    console.error('Error analyzing menu PDF:', error);

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
