/** Country codes + labels for billing (card + Plaid checkout). Values match Authorize.Net-style codes used today. */
export const CHECKOUT_COUNTRY_OPTIONS = [
  { value: 'USA', label: 'United States' },
  { value: 'CAN', label: 'Canada' },
  { value: 'MEX', label: 'Mexico' },
  { value: 'BRA', label: 'Brazil' },
  { value: 'COL', label: 'Colombia' },
  { value: 'JAM', label: 'Jamaica' },
  { value: 'NGA', label: 'Nigeria' },
  { value: 'PRI', label: 'Puerto Rico' },
  { value: 'GBR', label: 'United Kingdom' },
  { value: 'VEN', label: 'Venezuela' },
] as const;

export const DEFAULT_CHECKOUT_COUNTRY = 'USA';
