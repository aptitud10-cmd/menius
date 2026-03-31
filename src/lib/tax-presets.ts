export interface CountryTaxPreset {
  rate: number;
  label: string;
  included: boolean;
  flag: string;
  name: string;
  hasStates?: boolean;
}

export interface StateTaxRate {
  name: string;
  rate: number;
}

export const COUNTRY_TAX_PRESETS: Record<string, CountryTaxPreset> = {
  MX: { rate: 16,   label: 'IVA',       included: true,  flag: '🇲🇽', name: 'México' },
  US: { rate: 0,    label: 'Sales Tax', included: false, flag: '🇺🇸', name: 'United States', hasStates: true },
  CO: { rate: 19,   label: 'IVA',       included: false, flag: '🇨🇴', name: 'Colombia' },
  AR: { rate: 21,   label: 'IVA',       included: true,  flag: '🇦🇷', name: 'Argentina' },
  ES: { rate: 21,   label: 'IVA',       included: true,  flag: '🇪🇸', name: 'España' },
  CL: { rate: 19,   label: 'IVA',       included: true,  flag: '🇨🇱', name: 'Chile' },
  PE: { rate: 18,   label: 'IGV',       included: false, flag: '🇵🇪', name: 'Perú' },
  EC: { rate: 12,   label: 'IVA',       included: true,  flag: '🇪🇨', name: 'Ecuador' },
  CR: { rate: 13,   label: 'IVA',       included: true,  flag: '🇨🇷', name: 'Costa Rica' },
  PA: { rate: 7,    label: 'ITBMS',     included: false, flag: '🇵🇦', name: 'Panamá' },
  GT: { rate: 12,   label: 'IVA',       included: true,  flag: '🇬🇹', name: 'Guatemala' },
  HN: { rate: 15,   label: 'ISV',       included: true,  flag: '🇭🇳', name: 'Honduras' },
  SV: { rate: 13,   label: 'IVA',       included: true,  flag: '🇸🇻', name: 'El Salvador' },
  NI: { rate: 15,   label: 'IVA',       included: true,  flag: '🇳🇮', name: 'Nicaragua' },
  DO: { rate: 18,   label: 'ITBIS',     included: true,  flag: '🇩🇴', name: 'Rep. Dominicana' },
  VE: { rate: 16,   label: 'IVA',       included: true,  flag: '🇻🇪', name: 'Venezuela' },
  PY: { rate: 10,   label: 'IVA',       included: true,  flag: '🇵🇾', name: 'Paraguay' },
  UY: { rate: 22,   label: 'IVA',       included: true,  flag: '🇺🇾', name: 'Uruguay' },
  BO: { rate: 13,   label: 'IVA',       included: true,  flag: '🇧🇴', name: 'Bolivia' },
  GB: { rate: 20,   label: 'VAT',       included: true,  flag: '🇬🇧', name: 'United Kingdom' },
  DE: { rate: 19,   label: 'MwSt',      included: true,  flag: '🇩🇪', name: 'Deutschland' },
  FR: { rate: 20,   label: 'TVA',       included: true,  flag: '🇫🇷', name: 'France' },
  IT: { rate: 22,   label: 'IVA',       included: true,  flag: '🇮🇹', name: 'Italia' },
  CA: { rate: 5,    label: 'GST',       included: false, flag: '🇨🇦', name: 'Canada' },
  AU: { rate: 10,   label: 'GST',       included: true,  flag: '🇦🇺', name: 'Australia' },
};

export const COUNTRY_LIST = Object.entries(COUNTRY_TAX_PRESETS)
  .sort((a, b) => a[1].name.localeCompare(b[1].name))
  .map(([code, preset]) => ({ code, ...preset }));

export const US_STATE_TAX_RATES: Record<string, StateTaxRate> = {
  AL: { name: 'Alabama',             rate: 4     },
  AK: { name: 'Alaska',              rate: 0     },
  AZ: { name: 'Arizona',             rate: 5.6   },
  AR: { name: 'Arkansas',            rate: 6.5   },
  CA: { name: 'California',          rate: 7.25  },
  CO: { name: 'Colorado',            rate: 2.9   },
  CT: { name: 'Connecticut',         rate: 6.35  },
  DE: { name: 'Delaware',            rate: 0     },
  DC: { name: 'Washington D.C.',     rate: 6     },
  FL: { name: 'Florida',             rate: 6     },
  GA: { name: 'Georgia',             rate: 4     },
  HI: { name: 'Hawaii',              rate: 4     },
  ID: { name: 'Idaho',               rate: 6     },
  IL: { name: 'Illinois',            rate: 6.25  },
  IN: { name: 'Indiana',             rate: 7     },
  IA: { name: 'Iowa',                rate: 6     },
  KS: { name: 'Kansas',              rate: 6.5   },
  KY: { name: 'Kentucky',            rate: 6     },
  LA: { name: 'Louisiana',           rate: 4.45  },
  ME: { name: 'Maine',               rate: 5.5   },
  MD: { name: 'Maryland',            rate: 6     },
  MA: { name: 'Massachusetts',       rate: 6.25  },
  MI: { name: 'Michigan',            rate: 6     },
  MN: { name: 'Minnesota',           rate: 6.875 },
  MS: { name: 'Mississippi',         rate: 7     },
  MO: { name: 'Missouri',            rate: 4.225 },
  MT: { name: 'Montana',             rate: 0     },
  NE: { name: 'Nebraska',            rate: 5.5   },
  NV: { name: 'Nevada',              rate: 6.85  },
  NH: { name: 'New Hampshire',       rate: 0     },
  NJ: { name: 'New Jersey',          rate: 6.625 },
  NM: { name: 'New Mexico',          rate: 4.875 },
  NY: { name: 'New York',            rate: 4     },
  NC: { name: 'North Carolina',      rate: 4.75  },
  ND: { name: 'North Dakota',        rate: 5     },
  OH: { name: 'Ohio',                rate: 5.75  },
  OK: { name: 'Oklahoma',            rate: 4.5   },
  OR: { name: 'Oregon',              rate: 0     },
  PA: { name: 'Pennsylvania',        rate: 6     },
  RI: { name: 'Rhode Island',        rate: 7     },
  SC: { name: 'South Carolina',      rate: 6     },
  SD: { name: 'South Dakota',        rate: 4.5   },
  TN: { name: 'Tennessee',           rate: 7     },
  TX: { name: 'Texas',               rate: 6.25  },
  UT: { name: 'Utah',                rate: 4.85  },
  VT: { name: 'Vermont',             rate: 6     },
  VA: { name: 'Virginia',            rate: 4.3   },
  WA: { name: 'Washington',          rate: 6.5   },
  WV: { name: 'West Virginia',       rate: 6     },
  WI: { name: 'Wisconsin',           rate: 5     },
  WY: { name: 'Wyoming',             rate: 4     },
};

export const US_STATE_LIST = Object.entries(US_STATE_TAX_RATES)
  .sort((a, b) => a[1].name.localeCompare(b[1].name))
  .map(([code, state]) => ({ code, ...state }));

/**
 * Combined (state + county + city) tax rates for major US cities.
 * Source: publicly available state/city tax tables. Restaurant owners
 * should verify their exact rate at https://www.taxjar.com/rates/
 * These rates are approximate and may change; last reviewed 2025-Q4.
 */
export const US_CITY_TAX_RATES: Record<string, Array<{ name: string; rate: number }>> = {
  AL: [
    { name: 'Birmingham',   rate: 10.0  },
    { name: 'Huntsville',   rate: 9.0   },
    { name: 'Mobile',       rate: 10.0  },
    { name: 'Montgomery',   rate: 10.0  },
  ],
  AK: [
    { name: 'Anchorage',    rate: 0     },
    { name: 'Fairbanks',    rate: 0     },
    { name: 'Juneau',       rate: 5.0   },
  ],
  AZ: [
    { name: 'Chandler',     rate: 7.8   },
    { name: 'Mesa',         rate: 8.3   },
    { name: 'Phoenix',      rate: 8.6   },
    { name: 'Scottsdale',   rate: 8.05  },
    { name: 'Tempe',        rate: 8.1   },
    { name: 'Tucson',       rate: 8.7   },
  ],
  AR: [
    { name: 'Fort Smith',   rate: 8.5   },
    { name: 'Little Rock',  rate: 9.5   },
  ],
  CA: [
    { name: 'Anaheim',        rate: 7.75  },
    { name: 'Fresno',         rate: 8.35  },
    { name: 'Long Beach',     rate: 10.25 },
    { name: 'Los Angeles',    rate: 10.25 },
    { name: 'Oakland',        rate: 10.25 },
    { name: 'Riverside',      rate: 8.75  },
    { name: 'Sacramento',     rate: 8.75  },
    { name: 'San Diego',      rate: 7.75  },
    { name: 'San Francisco',  rate: 8.625 },
    { name: 'San Jose',       rate: 9.375 },
    { name: 'Santa Monica',   rate: 10.25 },
    { name: 'Stockton',       rate: 9.0   },
  ],
  CO: [
    { name: 'Aurora',             rate: 8.0   },
    { name: 'Boulder',            rate: 8.845 },
    { name: 'Colorado Springs',   rate: 7.63  },
    { name: 'Denver',             rate: 8.81  },
    { name: 'Fort Collins',       rate: 7.55  },
  ],
  CT: [
    { name: 'Bridgeport',   rate: 6.35 },
    { name: 'Hartford',     rate: 6.35 },
    { name: 'New Haven',    rate: 6.35 },
    { name: 'Stamford',     rate: 6.35 },
  ],
  DE: [
    { name: 'Dover',        rate: 0 },
    { name: 'Wilmington',   rate: 0 },
  ],
  DC: [
    { name: 'Washington D.C.', rate: 6.0 },
  ],
  FL: [
    { name: 'Fort Lauderdale',  rate: 6.5  },
    { name: 'Jacksonville',     rate: 7.0  },
    { name: 'Miami',            rate: 7.0  },
    { name: 'Orlando',          rate: 6.5  },
    { name: 'St. Petersburg',   rate: 7.5  },
    { name: 'Tallahassee',      rate: 7.5  },
    { name: 'Tampa',            rate: 7.5  },
  ],
  GA: [
    { name: 'Atlanta',      rate: 8.9  },
    { name: 'Augusta',      rate: 8.0  },
    { name: 'Columbus',     rate: 8.0  },
    { name: 'Savannah',     rate: 7.0  },
  ],
  HI: [
    { name: 'Hilo',         rate: 4.712 },
    { name: 'Honolulu',     rate: 4.712 },
  ],
  ID: [
    { name: 'Boise',        rate: 6.0 },
    { name: 'Nampa',        rate: 6.0 },
  ],
  IL: [
    { name: 'Aurora',       rate: 8.25  },
    { name: 'Chicago',      rate: 10.25 },
    { name: 'Joliet',       rate: 8.75  },
    { name: 'Naperville',   rate: 7.75  },
    { name: 'Peoria',       rate: 9.0   },
    { name: 'Rockford',     rate: 8.75  },
    { name: 'Springfield',  rate: 8.5   },
  ],
  IN: [
    { name: 'Fort Wayne',     rate: 7.0 },
    { name: 'Indianapolis',   rate: 7.0 },
    { name: 'South Bend',     rate: 7.0 },
  ],
  IA: [
    { name: 'Cedar Rapids',   rate: 7.0 },
    { name: 'Des Moines',     rate: 7.0 },
    { name: 'Sioux City',     rate: 7.0 },
  ],
  KS: [
    { name: 'Kansas City',    rate: 10.6 },
    { name: 'Overland Park',  rate: 9.1  },
    { name: 'Wichita',        rate: 7.5  },
  ],
  KY: [
    { name: 'Lexington',      rate: 6.0 },
    { name: 'Louisville',     rate: 6.0 },
  ],
  LA: [
    { name: 'Baton Rouge',    rate: 9.95 },
    { name: 'New Orleans',    rate: 9.45 },
    { name: 'Shreveport',     rate: 9.05 },
  ],
  ME: [
    { name: 'Augusta',        rate: 5.5 },
    { name: 'Portland',       rate: 5.5 },
  ],
  MD: [
    { name: 'Baltimore',      rate: 6.0 },
    { name: 'Rockville',      rate: 6.0 },
  ],
  MA: [
    { name: 'Boston',         rate: 6.25 },
    { name: 'Springfield',    rate: 6.25 },
    { name: 'Worcester',      rate: 6.25 },
  ],
  MI: [
    { name: 'Detroit',        rate: 6.0 },
    { name: 'Grand Rapids',   rate: 6.0 },
    { name: 'Lansing',        rate: 6.0 },
  ],
  MN: [
    { name: 'Duluth',         rate: 9.375 },
    { name: 'Minneapolis',    rate: 9.025 },
    { name: 'Saint Paul',     rate: 9.375 },
  ],
  MS: [
    { name: 'Gulfport',       rate: 7.0 },
    { name: 'Jackson',        rate: 8.0 },
  ],
  MO: [
    { name: 'Kansas City',    rate: 8.6   },
    { name: 'Springfield',    rate: 8.1   },
    { name: 'St. Louis',      rate: 9.679 },
  ],
  MT: [
    { name: 'Billings',       rate: 0 },
    { name: 'Missoula',       rate: 0 },
  ],
  NE: [
    { name: 'Lincoln',        rate: 7.25 },
    { name: 'Omaha',          rate: 7.0  },
  ],
  NV: [
    { name: 'Henderson',      rate: 8.375 },
    { name: 'Las Vegas',      rate: 8.375 },
    { name: 'Reno',           rate: 8.265 },
  ],
  NH: [
    { name: 'Manchester',     rate: 0 },
    { name: 'Nashua',         rate: 0 },
  ],
  NJ: [
    { name: 'Jersey City',    rate: 6.625 },
    { name: 'Newark',         rate: 6.625 },
    { name: 'Trenton',        rate: 6.625 },
  ],
  NM: [
    { name: 'Albuquerque',    rate: 7.875  },
    { name: 'Santa Fe',       rate: 8.4375 },
  ],
  NY: [
    { name: 'Albany',         rate: 8.0   },
    { name: 'Buffalo',        rate: 8.0   },
    { name: 'New York City',  rate: 8.875 },
    { name: 'Rochester',      rate: 8.0   },
    { name: 'Syracuse',       rate: 8.0   },
    { name: 'Yonkers',        rate: 8.375 },
  ],
  NC: [
    { name: 'Charlotte',      rate: 7.25 },
    { name: 'Durham',         rate: 7.25 },
    { name: 'Greensboro',     rate: 6.75 },
    { name: 'Raleigh',        rate: 7.25 },
  ],
  ND: [
    { name: 'Bismarck',       rate: 7.0 },
    { name: 'Fargo',          rate: 7.5 },
  ],
  OH: [
    { name: 'Akron',          rate: 6.75 },
    { name: 'Cincinnati',     rate: 7.8  },
    { name: 'Cleveland',      rate: 8.0  },
    { name: 'Columbus',       rate: 7.5  },
    { name: 'Toledo',         rate: 6.75 },
  ],
  OK: [
    { name: 'Oklahoma City',  rate: 8.625 },
    { name: 'Tulsa',          rate: 8.517 },
  ],
  OR: [
    { name: 'Eugene',         rate: 0 },
    { name: 'Portland',       rate: 0 },
    { name: 'Salem',          rate: 0 },
  ],
  PA: [
    { name: 'Allentown',      rate: 6.0 },
    { name: 'Erie',           rate: 6.0 },
    { name: 'Philadelphia',   rate: 8.0 },
    { name: 'Pittsburgh',     rate: 7.0 },
  ],
  RI: [
    { name: 'Providence',     rate: 7.0 },
  ],
  SC: [
    { name: 'Charleston',     rate: 9.0 },
    { name: 'Columbia',       rate: 8.0 },
    { name: 'Greenville',     rate: 6.0 },
  ],
  SD: [
    { name: 'Rapid City',     rate: 6.0 },
    { name: 'Sioux Falls',    rate: 6.5 },
  ],
  TN: [
    { name: 'Chattanooga',    rate: 9.25 },
    { name: 'Knoxville',      rate: 9.25 },
    { name: 'Memphis',        rate: 9.75 },
    { name: 'Nashville',      rate: 9.25 },
  ],
  TX: [
    { name: 'Arlington',      rate: 8.25 },
    { name: 'Austin',         rate: 8.25 },
    { name: 'Dallas',         rate: 8.25 },
    { name: 'El Paso',        rate: 8.25 },
    { name: 'Fort Worth',     rate: 8.25 },
    { name: 'Houston',        rate: 8.25 },
    { name: 'San Antonio',    rate: 8.25 },
  ],
  UT: [
    { name: 'Provo',          rate: 7.25 },
    { name: 'Salt Lake City', rate: 7.75 },
  ],
  VT: [
    { name: 'Burlington',     rate: 7.0 },
    { name: 'Montpelier',     rate: 6.0 },
  ],
  VA: [
    { name: 'Arlington',      rate: 6.0 },
    { name: 'Norfolk',        rate: 6.0 },
    { name: 'Richmond',       rate: 6.0 },
    { name: 'Virginia Beach', rate: 6.0 },
  ],
  WA: [
    { name: 'Bellevue',       rate: 10.2  },
    { name: 'Seattle',        rate: 10.25 },
    { name: 'Spokane',        rate: 8.9   },
    { name: 'Tacoma',         rate: 10.2  },
  ],
  WV: [
    { name: 'Charleston',     rate: 6.0 },
    { name: 'Huntington',     rate: 6.0 },
  ],
  WI: [
    { name: 'Madison',        rate: 5.5 },
    { name: 'Milwaukee',      rate: 5.5 },
  ],
  WY: [
    { name: 'Casper',         rate: 6.0 },
    { name: 'Cheyenne',       rate: 6.0 },
  ],
};

/**
 * Compute tax amount from subtotal.
 * Returns the tax amount (not the total).
 */
export function computeTaxAmount(
  subtotal: number,
  taxRate: number,
  taxIncluded: boolean,
): number {
  if (taxRate <= 0) return 0;
  const raw = taxIncluded
    ? subtotal - subtotal / (1 + taxRate / 100)
    : subtotal * (taxRate / 100);
  return Math.round(raw * 100) / 100;
}
