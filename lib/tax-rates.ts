/**
 * State sales tax lookup table for restaurant orders
 * Rates include state + average local taxes for dining
 * Updated as of 2024 - rates are estimates
 */

interface TaxRateData {
  state: string;
  rate: number; // Decimal format (e.g., 0.0825 = 8.25%)
  abbreviation: string;
}

const TAX_RATES: Record<string, TaxRateData> = {
  // States with no sales tax
  AK: { state: 'Alaska', rate: 0.0, abbreviation: 'AK' },
  DE: { state: 'Delaware', rate: 0.0, abbreviation: 'DE' },
  MT: { state: 'Montana', rate: 0.0, abbreviation: 'MT' },
  NH: { state: 'New Hampshire', rate: 0.0, abbreviation: 'NH' },
  OR: { state: 'Oregon', rate: 0.0, abbreviation: 'OR' },

  // States with sales tax (sorted alphabetically)
  AL: { state: 'Alabama', rate: 0.09, abbreviation: 'AL' },
  AR: { state: 'Arkansas', rate: 0.0935, abbreviation: 'AR' },
  AZ: { state: 'Arizona', rate: 0.083, abbreviation: 'AZ' },
  CA: { state: 'California', rate: 0.0863, abbreviation: 'CA' },
  CO: { state: 'Colorado', rate: 0.077, abbreviation: 'CO' },
  CT: { state: 'Connecticut', rate: 0.0635, abbreviation: 'CT' },
  DC: { state: 'District of Columbia', rate: 0.06, abbreviation: 'DC' },
  FL: { state: 'Florida', rate: 0.07, abbreviation: 'FL' },
  GA: { state: 'Georgia', rate: 0.0729, abbreviation: 'GA' },
  HI: { state: 'Hawaii', rate: 0.04, abbreviation: 'HI' },
  IA: { state: 'Iowa', rate: 0.0694, abbreviation: 'IA' },
  ID: { state: 'Idaho', rate: 0.06, abbreviation: 'ID' },
  IL: { state: 'Illinois', rate: 0.0894, abbreviation: 'IL' },
  IN: { state: 'Indiana', rate: 0.07, abbreviation: 'IN' },
  KS: { state: 'Kansas', rate: 0.0865, abbreviation: 'KS' },
  KY: { state: 'Kentucky', rate: 0.06, abbreviation: 'KY' },
  LA: { state: 'Louisiana', rate: 0.0945, abbreviation: 'LA' },
  MA: { state: 'Massachusetts', rate: 0.0625, abbreviation: 'MA' },
  MD: { state: 'Maryland', rate: 0.06, abbreviation: 'MD' },
  ME: { state: 'Maine', rate: 0.055, abbreviation: 'ME' },
  MI: { state: 'Michigan', rate: 0.06, abbreviation: 'MI' },
  MN: { state: 'Minnesota', rate: 0.0744, abbreviation: 'MN' },
  MO: { state: 'Missouri', rate: 0.0823, abbreviation: 'MO' },
  MS: { state: 'Mississippi', rate: 0.07, abbreviation: 'MS' },
  NC: { state: 'North Carolina', rate: 0.0698, abbreviation: 'NC' },
  ND: { state: 'North Dakota', rate: 0.0694, abbreviation: 'ND' },
  NE: { state: 'Nebraska', rate: 0.0694, abbreviation: 'NE' },
  NJ: { state: 'New Jersey', rate: 0.0663, abbreviation: 'NJ' },
  NM: { state: 'New Mexico', rate: 0.0779, abbreviation: 'NM' },
  NV: { state: 'Nevada', rate: 0.0823, abbreviation: 'NV' },
  NY: { state: 'New York', rate: 0.08, abbreviation: 'NY' },
  OH: { state: 'Ohio', rate: 0.0725, abbreviation: 'OH' },
  OK: { state: 'Oklahoma', rate: 0.0895, abbreviation: 'OK' },
  PA: { state: 'Pennsylvania', rate: 0.06, abbreviation: 'PA' },
  RI: { state: 'Rhode Island', rate: 0.07, abbreviation: 'RI' },
  SC: { state: 'South Carolina', rate: 0.07, abbreviation: 'SC' },
  SD: { state: 'South Dakota', rate: 0.064, abbreviation: 'SD' },
  TN: { state: 'Tennessee', rate: 0.0955, abbreviation: 'TN' },
  TX: { state: 'Texas', rate: 0.0825, abbreviation: 'TX' },
  UT: { state: 'Utah', rate: 0.0727, abbreviation: 'UT' },
  VA: { state: 'Virginia', rate: 0.0575, abbreviation: 'VA' },
  VT: { state: 'Vermont', rate: 0.06, abbreviation: 'VT' },
  WA: { state: 'Washington', rate: 0.092, abbreviation: 'WA' },
  WI: { state: 'Wisconsin', rate: 0.054, abbreviation: 'WI' },
  WV: { state: 'West Virginia', rate: 0.065, abbreviation: 'WV' },
  WY: { state: 'Wyoming', rate: 0.054, abbreviation: 'WY' },
};

// Fallback tax rate if state cannot be determined or is invalid
const DEFAULT_TAX_RATE = 0.08; // 8% national average

/**
 * Get tax rate for a given state
 * @param stateInput - State name (full or abbreviated) or abbreviation
 * @returns Tax rate as decimal (e.g., 0.0825 for 8.25%)
 */
export function getTaxRate(stateInput: string | null | undefined): number {
  if (!stateInput) {
    return DEFAULT_TAX_RATE;
  }

  // Normalize input
  const normalized = stateInput.trim().toLowerCase();

  // Try exact abbreviation match first (case-insensitive)
  const byAbbr = Object.entries(TAX_RATES).find(
    ([abbr]) => abbr.toLowerCase() === normalized
  );
  if (byAbbr) {
    return byAbbr[1].rate;
  }

  // Try full state name match
  const byName = Object.values(TAX_RATES).find(
    (data) => data.state.toLowerCase() === normalized
  );
  if (byName) {
    return byName.rate;
  }

  // Try partial match (e.g., "calif" matches "California")
  const partialMatch = Object.values(TAX_RATES).find((data) =>
    data.state.toLowerCase().startsWith(normalized)
  );
  if (partialMatch) {
    return partialMatch.rate;
  }

  // Fallback to default
  console.warn(`Could not find tax rate for "${stateInput}", using default ${DEFAULT_TAX_RATE}`);
  return DEFAULT_TAX_RATE;
}

/**
 * Get all available states with tax rates
 * @returns Array of state data
 */
export function getAllStates(): TaxRateData[] {
  return Object.values(TAX_RATES);
}

/**
 * Validate if a state abbreviation is valid
 * @param abbr - Two-letter state abbreviation
 * @returns True if valid state abbreviation
 */
export function isValidStateAbbr(abbr: string): boolean {
  return abbr.toUpperCase() in TAX_RATES;
}
