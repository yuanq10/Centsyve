import { getDb, dollarsToCents, CategoryKey } from './database';
import { createTransaction } from './transactions';

const SEED_DATA: Array<{ date: string; item: string; category: CategoryKey; amount: number }> = [
  { date: '2026-06-26', item: '大统华', category: 'daily', amount: 69.54 },
  { date: '2026-06-26', item: '寿司', category: 'daily', amount: 12.42 },
  { date: '2026-06-29', item: '大统华', category: 'daily', amount: 2.63 },
  { date: '2026-07-02', item: 'Food Basics', category: 'daily', amount: 33.99 },
  { date: '2026-07-03', item: 'Metro', category: 'daily', amount: 7.32 },
  { date: '2026-07-04', item: 'Costco', category: 'daily', amount: 133.00 },
  { date: '2026-07-04', item: '过桥米线餐馆', category: 'daily', amount: 75.35 },
];

const META_KEY = 'seed_imported';

export function importSeedData(): void {
  const db = getDb();
  const already = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [META_KEY]
  );
  if (already) return;

  for (const row of SEED_DATA) {
    createTransaction({
      date: row.date,
      item: row.item,
      category: row.category,
      amount_cents: dollarsToCents(row.amount),
    });
  }

  db.runSync(
    'INSERT INTO app_meta (key, value) VALUES (?, ?)',
    [META_KEY, '1']
  );
}
