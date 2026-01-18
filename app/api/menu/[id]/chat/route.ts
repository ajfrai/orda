/**
 * POST /api/menu/[id]/chat
 * Chat with Claude about menu items using conversation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Fetch menu data from database
    const supabase = getServiceRoleClient();
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (menuError || !menu) {
      console.error('[ERROR] Failed to fetch menu:', menuError);
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    // Build system message with menu context
    const systemPrompt = `You are a helpful restaurant menu assistant. You have complete knowledge of this menu and can answer questions about dishes, ingredients, prices, dietary restrictions, and recommendations.

Restaurant: ${menu.restaurant_name}
Location: ${menu.location_city}, ${menu.location_state}

MENU ITEMS:
${JSON.stringify(menu.items, null, 2)}

Guidelines:
- Be friendly, concise, and helpful
- Reference specific menu items by name when relevant
- Mention prices when discussing items
- If asked about dietary restrictions, check item descriptions and chips
- For spice level questions, look for "Spicy" in chips
- For vegetarian/vegan questions, check chips and descriptions
- If you don't have information, be honest about it
- Suggest alternatives when appropriate
- Keep responses focused and not too long (2-4 sentences usually)`;

    // Build conversation messages for Claude
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Claude API
    console.log('[DEBUG] Calling Claude API for menu chat');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Extract response text
    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log('[DEBUG] Chat response generated successfully');

    return NextResponse.json({
      response: assistantMessage.text,
      conversationId: id, // Use menu ID as conversation context
    });
  } catch (error) {
    console.error('[ERROR] Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process chat: ${errorMessage}` },
      { status: 500 }
    );
  }
}
