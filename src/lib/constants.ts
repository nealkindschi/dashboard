export const BOT_CATEGORIES = ['Search Engine', 'AI Crawler', 'AI Search', 'AI Assistant'] as const;

export const AREA_COUNTRIES: Record<string, string[]> = {
  AMER: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'],
  EMEA: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PL', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'ZA', 'AE', 'SA', 'IL'],
  APAC: ['JP', 'KR', 'CN', 'IN', 'AU', 'NZ', 'SG', 'ID', 'TH', 'VN', 'PH', 'MY', 'TW', 'HK'],
};

export const BOT_CATEGORY_COLORS: Record<string, string> = {
  'Search Engine': 'var(--chart-1)',
  'AI Crawler': 'var(--chart-2)',
  'AI Search': 'var(--chart-3)',
  'AI Assistant': 'var(--chart-4)',
};

export const CWV_THRESHOLDS: Record<string, { good: number; poor: number; unit: string; label: string }> = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'LCP' },
  inp: { good: 200, poor: 500, unit: 'ms', label: 'INP' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'CLS' },
};
