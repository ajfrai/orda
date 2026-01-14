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

/**
 * Fetch PDF from URL and return as base64
 */
async function fetchPdfAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Orda-Menu-Parser/1.0',
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('pdf')) {
    console.warn(`Warning: Content-Type is "${contentType}", expected PDF`);
  }

  // Check file size (10MB limit)
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    throw new Error('PDF file is too large (max 10MB)');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return buffer.toString('base64');
}

/**
 * Analyze a PDF menu using Claude's vision API
 * @param pdfUrl - URL to the PDF menu
 * @returns Menu analysis result
 */
export async function analyzeMenuPdf(pdfUrl: string): Promise<MenuAnalysisResult> {
  try {
    // Fetch PDF as base64
    const pdfBase64 = await fetchPdfAsBase64(pdfUrl);

    // Call Claude API with PDF
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `Please analyze this PDF and determine if it's a restaurant menu.

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
            },
          ],
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
      error: 'Failed to analyze PDF',
    };
  }
}
