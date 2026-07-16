import { SQLiteBindValue } from 'expo-sqlite';
import { getDb, RecurringRule, CategoryKey } from './database';
import { createTransaction } from './transactions';

export interface CreateRecurringInput {
  name: string;
  category: CategoryKey;
  amount_cents: number;
  day_of_month: number;
  start_date: string;
  end_date?: string | null;
}

export function getAllRules(): RecurringRule[] {
  return getDb().getAllSync<RecurringRule>(
    'SELECT * FROM recurring_rules ORDER BY name ASC'
  );
}

export function getRuleById(id: number): RecurringRule | null {
  return getDb().getFirstSync<RecurringRule>(
    'SELECT * FROM recurring_rules WHERE id = ?',
    [id]
  ) ?? null;
}

export function createRule(input: CreateRecurringInput): number {
  const result = getDb().runSync(
    `INSERT INTO recurring_rules
       (name, category, amount_cents, day_of_month, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.category,
      input.amount_cents,
      Math.min(input.day_of_month, 28),
      input.start_date,
      input.end_date ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export function updateRule(id: number, input: Partial<CreateRecurringInput>): void {
  const fields: string[] = [];
  const values: SQLiteBindValue[] = [];
  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
  if (input.amount_cents !== undefined) { fields.push('amount_cents = ?'); values.push(input.amount_cents); }
  if (input.day_of_month !== undefined) { fields.push('day_of_month = ?'); values.push(Math.min(input.day_of_month, 28)); }
  if (input.start_date !== undefined) { fields.push('start_date = ?'); values.push(input.start_date); }
  if ('end_date' in input) { fields.push('end_date = ?'); values.push(input.end_date ?? null); }
  if (fields.length === 0) return;
  values.push(id);
  getDb().runSync(`UPDATE recurring_rules SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function togglePause(id: number, paused: boolean): void {
  getDb().runSync('UPDATE recurring_rules SET is_paused = ? WHERE id = ?', [paused ? 1 : 0, id]);
}

export function deleteRule(id: number): void {
  getDb().runSync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

// ── catch-up posting ──────────────────────────────────────────────────────────

function yearMonthToStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function strToYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function monthsInRange(
  fromYM: string,
  toYM: string
): Array<{ year: number; month: number }> {
  const result: Array<{ year: number; month: number }> = [];
  let cur = strToYearMonth(fromYM);
  const end = strToYearMonth(toYM);
  while (
    cur.year < end.year ||
    (cur.year === end.year && cur.month <= end.month)
  ) {
    result.push({ ...cur });
    cur = nextMonth(cur.year, cur.month);
  }
  return result;
}

function todayYM(): string {
  const now = new Date();
  return yearMonthToStr(now.getFullYear(), now.getMonth() + 1);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Run on every app launch. For each active rule, post any months that should
 * have been posted but haven't been yet (including catch-up for missed months).
 * Wrapped in a single DB transaction for atomicity.
 */
export function runCatchUpPosting(): void {
  const rules = getAllRules();
  const today = todayStr();
  const todayYm = todayYM();
  const [todayY, todayM, todayD] = today.split('-').map(Number);

  getDb().withTransactionSync(() => {
    for (const rule of rules) {
      if (rule.is_paused) continue;
      if (rule.start_date > today) continue;
      if (rule.end_date && rule.end_date < today) continue;

      const ruleStartYM = rule.start_date.slice(0, 7); // 'YYYY-MM'
      const fromYM = rule.last_posted_month
        ? (() => {
            const { year, month } = strToYearMonth(rule.last_posted_month);
            const nm = nextMonth(year, month);
            return yearMonthToStr(nm.year, nm.month);
          })()
        : ruleStartYM;

      if (fromYM > todayYm) continue;

      const months = monthsInRange(fromYM, todayYm);
      let lastPosted = rule.last_posted_month;

      for (const { year, month } of months) {
        const ym = yearMonthToStr(year, month);
        const isCurrentMonth = ym === todayYm;
        // Only post current month if the day has been reached
        if (isCurrentMonth && rule.day_of_month > todayD) continue;

        // Clamp day to last day of that month (handles 28/29/30/31)
        const lastDay = new Date(year, month, 0).getDate();
        const postDay = Math.min(rule.day_of_month, lastDay);
        const postDate = `${year}-${String(month).padStart(2, '0')}-${String(postDay).padStart(2, '0')}`;

        createTransaction({
          date: postDate,
          item: rule.name,
          category: rule.category,
          amount_cents: rule.amount_cents,
          recurring_id: rule.id,
        });

        lastPosted = ym;
      }

      if (lastPosted !== rule.last_posted_month) {
        getDb().runSync(
          'UPDATE recurring_rules SET last_posted_month = ? WHERE id = ?',
          [lastPosted, rule.id]
        );
      }
    }
  });
}
