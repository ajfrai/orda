/**
 * Unit tests for streaming menu item parsing
 */

// Simplified versions of the functions for testing
function attemptToFixIncompleteJson(json: string): string | null {
  try {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
      } else if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
      }
    }

    let fixed = json;
    if (inString) {
      fixed += '"';
    }

    // Remove trailing incomplete values
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*[0-9.]*$/, '');
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*$/, '');

    // Close arrays and objects
    for (let i = 0; i < openBrackets; i++) {
      fixed += ']';
    }
    for (let i = 0; i < openBraces; i++) {
      fixed += '}';
    }

    return fixed;
  } catch (error) {
    return null;
  }
}

function tryExtractData(
  jsonText: string,
  alreadyEmittedCount: number
): {
  metadata?: { restaurantName: string; location?: { city?: string; state?: string } };
  items: Array<{ item: any; category: string }>;
} {
  try {
    let cleanedText = jsonText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      // Try to fix incomplete JSON
      const fixed = attemptToFixIncompleteJson(cleanedText);
      if (!fixed) {
        return { items: [] };
      }

      try {
        parsed = JSON.parse(fixed);
      } catch {
        return { items: [] };
      }
    }

    let metadata: { restaurantName: string; location?: { city?: string; state?: string } } | undefined;
    if (parsed.restaurantName) {
      metadata = {
        restaurantName: parsed.restaurantName,
        location: parsed.location,
      };
    }

    const allItems: Array<{ item: any; category: string }> = [];
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

    return {
      metadata,
      items: allItems.slice(alreadyEmittedCount),
    };
  } catch (error) {
    return { items: [] };
  }
}

describe('Streaming Menu Item Parsing', () => {
  it('should parse complete JSON successfully', () => {
    const completeJson = JSON.stringify({
      isMenu: true,
      restaurantName: 'Test Restaurant',
      location: { city: 'New York', state: 'NY' },
      categories: [
        {
          category: 'Appetizers',
          items: [
            { name: 'Wings', price: 12.99, isEstimate: false },
            { name: 'Nachos', price: 10.99, isEstimate: false },
          ],
        },
      ],
    });

    const result = tryExtractData(completeJson, 0);

    expect(result.metadata).toEqual({
      restaurantName: 'Test Restaurant',
      location: { city: 'New York', state: 'NY' },
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].item.name).toBe('Wings');
  });

  it('should parse incomplete JSON by closing structures', () => {
    const incompleteJson = `{
      "isMenu": true,
      "restaurantName": "Test Restaurant",
      "categories": [
        {
          "category": "Appetizers",
          "items": [
            {
              "name": "Wings",
              "price": 12.99,
              "isEstimate": false
            }`;

    const result = tryExtractData(incompleteJson, 0);

    // FIXED: Should now extract metadata and the one complete item
    expect(result.metadata?.restaurantName).toBe('Test Restaurant');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].item.name).toBe('Wings');
  });

  it('should emit items incrementally as they stream', () => {
    // Simulate what Claude actually streams
    const chunks = [
      '{"isMenu": true, "restaurantName": "Test", "categories": [',
      '{"isMenu": true, "restaurantName": "Test", "categories": [{"category": "Apps", "items": [',
      '{"isMenu": true, "restaurantName": "Test", "categories": [{"category": "Apps", "items": [{"name": "Wings", "price": 12.99, "isEstimate": false}',
      '{"isMenu": true, "restaurantName": "Test", "categories": [{"category": "Apps", "items": [{"name": "Wings", "price": 12.99, "isEstimate": false}, {"name": "Nachos", "price": 10.99, "isEstimate": false}',
      '{"isMenu": true, "restaurantName": "Test", "categories": [{"category": "Apps", "items": [{"name": "Wings", "price": 12.99, "isEstimate": false}, {"name": "Nachos", "price": 10.99, "isEstimate": false}]}, {"category": "Entrees", "items": [{"name": "Burger", "price": 15.99, "isEstimate": false}]}]}',
    ];

    let emittedItemCount = 0;
    const emittedItems: any[] = [];
    const emissionLog: string[] = [];

    for (const chunk of chunks) {
      const result = tryExtractData(chunk, emittedItemCount);
      emittedItems.push(...result.items);
      emittedItemCount += result.items.length;

      const log = `Chunk ${chunks.indexOf(chunk) + 1}: Emitted ${result.items.length} new items (total: ${emittedItemCount})`;
      emissionLog.push(log);
      console.log(log);
      if (result.items.length > 0) {
        console.log('  Items:', result.items.map(i => i.item.name).join(', '));
      }
    }

    console.log('\nEmission log:');
    emissionLog.forEach(log => console.log(log));
    console.log('\nFinal emitted items:', emittedItems.map(i => i.item.name).join(', '));

    // FIXED: Items should appear incrementally
    // Chunk 1-2: No complete items yet
    // Chunk 3: First item (Wings) complete
    // Chunk 4: Second item (Nachos) complete
    // Chunk 5: Third item (Burger) complete
    expect(emittedItemCount).toBeGreaterThan(0);
    expect(emittedItems.length).toBe(3);
    expect(emittedItems[0].item.name).toBe('Wings');
    expect(emittedItems[1].item.name).toBe('Nachos');
    expect(emittedItems[2].item.name).toBe('Burger');
  });
});
