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
