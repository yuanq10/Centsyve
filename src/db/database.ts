import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('centsyve.db');
  }
  return db;
}

export const CATEGORY_KEYS = [
  'rent',
  'utilities',
  'phone',
  'commute',
  'car',
  'daily',
  'other',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface Transaction {
  id: number;
  date: string;           // 'YYYY-MM-DD'
  item: string;
  category: CategoryKey;
  amount_cents: number;   // positive = expense
  recurring_id: number | null;
  created_at: string;
}

export interface RecurringRule {
  id: number;
  name: string;
  category: CategoryKey;
  amount_cents: number;
  day_of_month: number;   // 1–28
  start_date: string;     // 'YYYY-MM-DD'
  end_date: string | null;
  is_paused: number;      // 0 | 1
  last_posted_month: string | null; // 'YYYY-MM'
}

export async function initDatabase(): Promise<void> {
  const database = getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      recurring_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_tx_cat ON transactions(category);

    CREATE TABLE IF NOT EXISTS recurring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      day_of_month INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_paused INTEGER NOT NULL DEFAULT 0,
      last_posted_month TEXT
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert dollar string/number to integer cents (e.g. "12.34" → 1234) */
export function dollarsToCents(dollars: number | string): number {
  return Math.round(Number(dollars) * 100);
}

/** Format integer cents as "$1,234.56" display string */
export function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
