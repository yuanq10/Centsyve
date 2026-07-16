import { t } from '../i18n';

/** Format cents as display currency string, e.g. 1234 → "12.34" */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a user-typed dollar string to cents. Returns null if invalid. */
export function parseCurrencyInput(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100);
}

/** Format an ISO date string 'YYYY-MM-DD' for display */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const monthName = t(`summary.months.${month}`);
  return `${monthName} ${day}, ${year}`;
}

/** Return today as 'YYYY-MM-DD' */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Group an array by a string key */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/** Compute percentage change, returns null if prior is 0 */
export function percentChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}
