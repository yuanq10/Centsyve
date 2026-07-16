import { SQLiteBindValue } from 'expo-sqlite';
import { getDb, Transaction, CategoryKey } from './database';

export interface CreateTransactionInput {
  date: string;
  item: string;
  category: CategoryKey;
  amount_cents: number;
  recurring_id?: number | null;
}

export function getAllTransactions(): Transaction[] {
  return getDb().getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC'
  );
}

export function getTransactionsByMonth(year: number, month: number): Transaction[] {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to = `${year}-${String(month).padStart(2, '0')}-31`;
  return getDb().getAllSync<Transaction>(
    'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC',
    [from, to]
  );
}

export function getTransactionsByYear(year: number): Transaction[] {
  return getDb().getAllSync<Transaction>(
    "SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date ASC",
    [`${year}-01-01`, `${year}-12-31`]
  );
}

export function getTransactionsByDateRange(from: string, to: string): Transaction[] {
  return getDb().getAllSync<Transaction>(
    'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [from, to]
  );
}

export function createTransaction(input: CreateTransactionInput): number {
  const result = getDb().runSync(
    'INSERT INTO transactions (date, item, category, amount_cents, recurring_id) VALUES (?, ?, ?, ?, ?)',
    [input.date, input.item, input.category, input.amount_cents, input.recurring_id ?? null]
  );
  return result.lastInsertRowId;
}

export function updateTransaction(
  id: number,
  input: Partial<Omit<CreateTransactionInput, 'recurring_id'>>
): void {
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];
  if (input.date !== undefined) { fields.push('date = ?'); values.push(input.date); }
  if (input.item !== undefined) { fields.push('item = ?'); values.push(input.item); }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
  if (input.amount_cents !== undefined) { fields.push('amount_cents = ?'); values.push(input.amount_cents); }
  if (fields.length === 0) return;
  values.push(id);
  getDb().runSync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteTransaction(id: number): void {
  getDb().runSync('DELETE FROM transactions WHERE id = ?', [id]);
}

export function deleteTransactionsByRecurringId(recurringId: number): void {
  getDb().runSync('DELETE FROM transactions WHERE recurring_id = ?', [recurringId]);
}

export function countTransactionsByRecurringId(recurringId: number): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE recurring_id = ?',
    [recurringId]
  );
  return row?.count ?? 0;
}

/** Monthly pivot for Summary screen: GROUP BY year-month and category */
export interface MonthlyCategorySum {
  month: number;
  category: string;
  total_cents: number;
}

export function getMonthlyCategorySums(year: number): MonthlyCategorySum[] {
  return getDb().getAllSync<MonthlyCategorySum>(
    `SELECT
       CAST(strftime('%m', date) AS INTEGER) as month,
       category,
       SUM(amount_cents) as total_cents
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY month, category`,
    [`${year}-01-01`, `${year}-12-31`]
  );
}
