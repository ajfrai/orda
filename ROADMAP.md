# Orda Roadmap: Quality, Efficiency & Business Value

## Vision

Transform Orda from a **bill-splitting utility** into a **food discovery platform** powered by real menu data — while keeping the collaborative ordering experience at its core.

---

## Month 1: Foundation & Validation

### Week 1: Prompt Accuracy & Evaluation Framework

**Goal**: Understand current parsing quality and build infrastructure to measure it.

#### 1.1 Golden Dataset Creation
- [ ] Collect 20 diverse menu samples (mix of cuisines, formats, quality)
  - 5 clean PDFs (high-quality restaurant menus)
  - 5 photographed paper menus (real-world mobile uploads)
  - 5 ethnic restaurant menus (non-English items, regional dishes)
  - 5 edge cases (handwritten, chalkboard, multi-page, poor quality)
- [ ] Manually annotate ground truth for each:
  - Restaurant name
  - Location
  - All menu items with correct prices
  - Correct category assignments
  - Accurate dietary tags

#### 1.2 Evaluation Metrics
Create automated scoring for:

| Metric | Description | Target |
|--------|-------------|--------|
| **Restaurant name accuracy** | Exact or fuzzy match | >95% |
| **Location extraction rate** | Found when present on menu | >80% |
| **Item recall** | % of real items captured | >90% |
| **Item precision** | % of captured items that are real | >95% |
| **Price accuracy** | Exact match (±$0.50 tolerance) | >85% |
| **Category coherence** | Items in sensible categories | >90% |
| **Dietary tag precision** | Tags are correct when present | >90% |
| **Dietary tag recall** | Tags found when they should be | >70% |

#### 1.3 Evaluation Script
```
/scripts/evaluate-prompt.ts
- Takes: menu file + ground truth JSON
- Outputs: accuracy scores per metric
- Aggregates: overall prompt performance score
```

#### 1.4 Prompt Versioning
- [ ] Create `/prompts/` directory with versioned prompt files
- [ ] Add prompt version to menu metadata in database
- [ ] Track which prompt version produced each menu parse

---

### Week 2: Prompt Improvements

**Goal**: Improve accuracy based on Week 1 findings.

#### 2.1 Common Failure Analysis
After running evaluation, categorize failures:
- **Extraction failures**: Items missed entirely
- **Price errors**: Wrong price or unnecessary estimates
- **Category confusion**: Items in wrong category
- **Dietary tag errors**: Missing or incorrect tags
- **Format failures**: JSON parsing issues

#### 2.2 Prompt Iteration Areas

**Better price handling**:
- Current: Estimates when "missing or unclear"
- Improve: More specific guidance on market price variations
- Add: Price range awareness by cuisine type

**Better dietary tag detection**:
- Current: Generic list of tags
- Improve: Cuisine-specific indicators (e.g., "contains fish sauce" for Thai)
- Add: Confidence levels for inferred vs explicit tags

**Better category extraction**:
- Current: Uses menu's categories
- Improve: Standardize common categories
- Add: Handle menus without clear sections

**Regional/cultural awareness** (NEW):
```
Identify regional cuisine style when possible:
- "Sichuan Chinese" vs "Cantonese Chinese"
- "Northern Thai" vs "Central Thai"
- "Texas BBQ" vs "Carolina BBQ"
- "NYC pizza" vs "Detroit-style"
Store as: regionalStyle field
```

#### 2.3 A/B Testing Infrastructure
- [ ] Ability to run same menu through multiple prompt versions
- [ ] Compare outputs side-by-side
- [ ] Track which version performs better per metric

---

### Week 3: Data Enrichment & Schema Evolution

**Goal**: Capture richer data to enable discovery features.

#### 3.1 Enhanced Menu Item Schema

```typescript
interface EnrichedMenuItem {
  // Existing fields
  name: string;
  description?: string;
  price?: number;
  isEstimate: boolean;
  chips: string[];  // dietary tags

  // NEW: Discovery fields
  normalizedName?: string;      // "Pad Thai" for "Phad Thai Noodles"
  cuisineType?: string;         // "Thai", "Mexican", "American"
  regionalStyle?: string;       // "Northern Thai", "Tex-Mex", "Cajun"
  dishType?: string;            // "noodles", "curry", "sandwich", "soup"
  proteinType?: string[];       // ["chicken", "shrimp"]
  comfortFoodFlag?: boolean;    // Is this a comfort/homestyle dish?
  authenticityMarkers?: string[]; // ["traditional preparation", "family recipe"]
}
```

#### 3.2 Enhanced Menu Schema

```typescript
interface EnrichedMenu {
  // Existing fields
  restaurantName: string;
  location: { city?: string; state?: string };

  // NEW: Discovery fields
  cuisineTypes: string[];         // ["Thai", "Vietnamese"]
  priceRange: 'budget' | 'moderate' | 'upscale';
  atmosphereHints?: string[];     // ["family-style", "hole-in-wall", "upscale"]

  // NEW: Nostalgic/regional fields
  regionalIdentity?: string;      // "Gulf Coast", "Midwest", "Northeast"
  communityAssociations?: string[]; // ["Vietnamese community", "Jewish deli"]
}
```

#### 3.3 Database Migration
- [ ] Add new columns to menus table (nullable for backwards compat)
- [ ] Add new fields to items JSONB structure
- [ ] Create indexes for search fields

#### 3.4 Prompt Updates for Enrichment
Update Claude prompt to extract new fields:
- Cuisine type detection
- Regional style identification
- Dish type classification
- Comfort food flagging

---

### Week 4: User Feedback & Search Foundation

**Goal**: Close the feedback loop and build basic discovery.

#### 4.1 User Feedback System

**Item-level corrections**:
- [ ] "Report incorrect price" button
- [ ] "Wrong dietary info" flag
- [ ] "Item doesn't exist" flag
- [ ] Store feedback in new `menu_feedback` table

**Menu-level feedback**:
- [ ] "Restaurant name is wrong"
- [ ] "Location is wrong"
- [ ] "This isn't a menu"

**Schema**:
```sql
CREATE TABLE menu_feedback (
  id UUID PRIMARY KEY,
  menu_id UUID REFERENCES menus(id),
  item_index INT,  -- null for menu-level feedback
  feedback_type TEXT,  -- 'wrong_price', 'wrong_dietary', 'wrong_name', etc.
  user_provided_value TEXT,  -- what user says is correct
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.2 Feedback-Driven Improvements
- [ ] Weekly review of accumulated feedback
- [ ] Identify systematic prompt failures
- [ ] Update golden dataset with real-world edge cases

#### 4.3 Basic Search API

```typescript
// GET /api/search?q=pad+thai&location=austin
interface SearchParams {
  q?: string;           // dish name search
  cuisineType?: string; // filter by cuisine
  dietary?: string[];   // filter by dietary tags
  location?: string;    // city/state
  priceRange?: string;  // budget/moderate/upscale
}

interface SearchResult {
  menuId: string;
  restaurantName: string;
  location: { city?: string; state?: string };
  matchingItems: {
    name: string;
    price: number;
    category: string;
  }[];
}
```

#### 4.4 Search UI (Basic)
- [ ] Search input on landing page
- [ ] Results page showing restaurants + matching dishes
- [ ] Click through to view full menu

---

## Future Months Preview

### Month 2: Community & Discovery

- **"Tastes like home" tags**: Let users tag dishes/restaurants
- **Community notes**: "Order the daily special", "Ask for extra sauce"
- **Dish ratings**: Rate specific dishes, not just restaurants
- **Regional identity pages**: "Cajun food in Houston", "Korean in LA"

### Month 3: Intelligence & Recommendations

- **"Build me an order" AI**: Input constraints, get suggested order
- **Similar dish discovery**: "Find dishes like X"
- **Price benchmarking**: "This is priced above/below average"
- **Menu freshness tracking**: Flag potentially outdated menus

### Month 4: Platform & Partnerships

- **Restaurant claiming**: Restaurants verify and update their menus
- **API access**: Developers can query menu data
- **Analytics dashboard**: Insights for restaurant owners
- **Embeddable cart widget**: White-label group ordering

---

## Prompt Evaluation System (Detailed)

### Evaluation Pipeline

```
┌─────────────────┐
│  Menu File      │
│  (PDF/Image)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse with     │
│  Current Prompt │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Parsed Output  │────▶│  Compare with   │
│  (JSON)         │     │  Ground Truth   │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Accuracy       │
                        │  Report         │
                        └─────────────────┘
```

### Ground Truth Format

```json
{
  "menuFile": "golden/thai-restaurant-01.pdf",
  "groundTruth": {
    "restaurantName": "Lotus Thai Kitchen",
    "location": { "city": "Austin", "state": "TX" },
    "cuisineType": "Thai",
    "regionalStyle": "Central Thai",
    "categories": [
      {
        "category": "Appetizers",
        "items": [
          {
            "name": "Spring Rolls",
            "price": 8.95,
            "dietary": ["Vegetarian"],
            "description": "Crispy vegetable rolls with sweet chili sauce"
          },
          {
            "name": "Tom Yum Soup",
            "price": 6.95,
            "dietary": ["Gluten Free", "Spicy"],
            "description": "Hot and sour soup with mushrooms and lemongrass"
          }
        ]
      }
    ]
  }
}
```

### Scoring Functions

```typescript
// Item matching with fuzzy name comparison
function scoreItemRecall(parsed: MenuItem[], truth: MenuItem[]): number {
  const matched = truth.filter(t =>
    parsed.some(p => fuzzyMatch(p.name, t.name) > 0.8)
  );
  return matched.length / truth.length;
}

// Price accuracy within tolerance
function scorePriceAccuracy(parsed: MenuItem[], truth: MenuItem[]): number {
  const matchedPairs = matchItems(parsed, truth);
  const accurate = matchedPairs.filter(([p, t]) =>
    Math.abs(p.price - t.price) <= 0.50
  );
  return accurate.length / matchedPairs.length;
}

// Dietary tag F1 score
function scoreDietaryTags(parsed: MenuItem[], truth: MenuItem[]): {
  precision: number;
  recall: number;
  f1: number;
} {
  // ... calculate precision/recall for dietary tags
}
```

### Automated Test Runner

```bash
# Run evaluation on golden dataset
npm run evaluate:prompt

# Output:
# ┌────────────────────────┬─────────┬────────┐
# │ Metric                 │ Score   │ Target │
# ├────────────────────────┼─────────┼────────┤
# │ Restaurant Name        │ 100%    │ >95%   │
# │ Location Extraction    │ 85%     │ >80%   │
# │ Item Recall            │ 92%     │ >90%   │
# │ Item Precision         │ 97%     │ >95%   │
# │ Price Accuracy         │ 78%     │ >85%   │ ← NEEDS WORK
# │ Category Coherence     │ 94%     │ >90%   │
# │ Dietary Precision      │ 88%     │ >90%   │
# │ Dietary Recall         │ 65%     │ >70%   │ ← NEEDS WORK
# └────────────────────────┴─────────┴────────┘
```

---

## Priority Matrix

| Initiative | Impact | Effort | Priority |
|------------|--------|--------|----------|
| Prompt evaluation framework | High | Medium | **P0** |
| Golden dataset creation | High | Medium | **P0** |
| User feedback collection | High | Low | **P0** |
| Prompt improvements (accuracy) | High | Medium | **P1** |
| Enhanced item schema | Medium | Low | **P1** |
| Basic dish search | High | Medium | **P1** |
| Regional/cultural tagging | Medium | Medium | **P2** |
| Community features | Medium | High | **P2** |
| "Tastes like home" tags | Medium | Medium | **P2** |
| AI order recommendations | High | High | **P3** |

---

## Success Metrics

### Week 1
- [ ] 20 menus in golden dataset with ground truth
- [ ] Evaluation script producing accuracy reports
- [ ] Baseline accuracy numbers documented

### Week 2
- [ ] At least 2 prompt iterations tested
- [ ] Price accuracy improved by 5%+
- [ ] Dietary tag recall improved by 10%+

### Week 3
- [ ] Database schema migrated
- [ ] Enriched fields being captured
- [ ] Cuisine type detected for >80% of menus

### Week 4
- [ ] Feedback UI live
- [ ] Search API functional
- [ ] At least 10 user feedback items collected

---

## Technical Debt to Address

1. **Prompt duplication**: Same prompt in `analyzeMenuWithClaude` and `analyzeMenuWithProgress` — consolidate
2. **No prompt versioning**: Can't track which prompt produced which results
3. **No automated testing on real menus**: Only unit tests with mocked data
4. **No feedback mechanism**: Users can't report errors
5. **No search indexes**: Would need to add for efficient dish search

---

## The Bigger Picture

```
NOW                          MONTH 1                      MONTH 2+
────────────────────────────────────────────────────────────────────

Bill splitting    →    Accurate menu data    →    Food discovery
utility                 + quality metrics          platform

"Split the           "Reliable, enriched        "Find the food
 bill easily"         menu parsing"              that feels like
                                                 home"
```

The foundation we build in Month 1 (accurate parsing + feedback loops) enables everything else. Without trustworthy data, search and discovery features would surface garbage.

**The moat**: Every parsed menu, every user correction, every "tastes like home" tag makes the dataset more valuable and harder to replicate.
