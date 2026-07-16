import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { CATEGORY_KEYS, CategoryKey } from '../db/database';
import { getTransactionsByDateRange } from '../db/transactions';
import { useTransactionStore } from '../store/useTransactionStore';
import { t } from '../i18n';
import { formatCurrency, percentChange } from '../utils/formatting';

type Range = '1W' | '1M' | '1Y' | 'YTD';
const RANGES: Range[] = ['1W', '1M', '1Y', 'YTD'];

// Timezone-safe ISO string
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateAdd(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function mmdd(d: Date): string {
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
}

interface DataPoint {
  value: number;
  label: string;
  dataPointText?: string;
}

/** Build Mon–Sun calendar week bars for a calendar month, clamped to clampEnd. */
function buildWeeklyPoints(
  monthStart: Date,
  monthEnd: Date,
  clampEnd: Date,
  txs: { date: string; amount_cents: number }[]
): DataPoint[] {
  const points: DataPoint[] = [];
  const effectiveEnd = clampEnd < monthEnd ? clampEnd : monthEnd;

  // Monday on or before monthStart
  const dow = monthStart.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  let weekStart = dateAdd(monthStart, -daysToMon);

  while (weekStart <= effectiveEnd) {
    const weekEnd = dateAdd(weekStart, 6);
    const sliceStart = weekStart < monthStart ? monthStart : weekStart;
    const sliceEnd = weekEnd > effectiveEnd ? effectiveEnd : weekEnd;

    if (sliceStart <= sliceEnd) {
      const fromStr = toLocalISO(sliceStart);
      const toStr = toLocalISO(sliceEnd);
      const total = txs
        .filter((tx) => tx.date >= fromStr && tx.date <= toStr)
        .reduce((s, tx) => s + tx.amount_cents, 0);
      const label =
        sliceStart.getTime() === sliceEnd.getTime()
          ? mmdd(sliceStart)
          : `${mmdd(sliceStart)}-${mmdd(sliceEnd)}`;
      points.push({ value: total / 100, label });
    }
    weekStart = dateAdd(weekStart, 7);
  }
  return points;
}

export default function TrendsScreen() {
  const transactions = useTransactionStore((s) => s.transactions);
  const [range, setRange] = useState<Range>('1M');
  const [catFilter, setCatFilter] = useState<CategoryKey | 'all'>('all');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { points, periodTotal, priorTotal } = useMemo(() => {
    let from: string, to: string, priorFrom: string, priorTo: string;
    const todayStr = toLocalISO(today);

    if (range === '1W') {
      from = toLocalISO(dateAdd(today, -6));
      to = todayStr;
      priorFrom = toLocalISO(dateAdd(today, -13));
      priorTo = toLocalISO(dateAdd(today, -7));
    } else if (range === '1M') {
      from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      to = todayStr;
      const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
      const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
      priorFrom = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      priorTo = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;
    } else if (range === '1Y') {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      d.setDate(d.getDate() + 1);
      from = toLocalISO(d);
      to = todayStr;
      const pd = new Date(d);
      pd.setFullYear(pd.getFullYear() - 1);
      priorFrom = toLocalISO(pd);
      priorTo = toLocalISO(dateAdd(new Date(d), -1));
    } else {
      // YTD
      from = `${today.getFullYear()}-01-01`;
      to = todayStr;
      priorFrom = `${today.getFullYear() - 1}-01-01`;
      priorTo = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    const txs = getTransactionsByDateRange(from, to);
    const priorTxs = getTransactionsByDateRange(priorFrom, priorTo);

    const filtered = catFilter === 'all' ? txs : txs.filter((tx) => tx.category === catFilter);
    const priorFiltered = catFilter === 'all' ? priorTxs : priorTxs.filter((tx) => tx.category === catFilter);

    const periodTotal = filtered.reduce((s, tx) => s + tx.amount_cents, 0);
    const priorTotal = priorFiltered.reduce((s, tx) => s + tx.amount_cents, 0);

    let points: DataPoint[] = [];

    if (range === '1W') {
      for (let i = 6; i >= 0; i--) {
        const d = toLocalISO(dateAdd(today, -i));
        const total = filtered.filter((tx) => tx.date === d).reduce((s, tx) => s + tx.amount_cents, 0);
        points.push({ value: total / 100, label: mmdd(new Date(d + 'T00:00:00')) });
      }
    } else if (range === '1M') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      points = buildWeeklyPoints(monthStart, monthEnd, today, filtered);
    } else {
      // 1Y or YTD — one point per month
      const startDate = new Date(from + 'T00:00:00');
      const endDate = new Date(to + 'T00:00:00');
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur <= endDate) {
        const y = cur.getFullYear();
        const m = cur.getMonth() + 1;
        const ymStr = `${y}-${String(m).padStart(2, '0')}`;
        const total = filtered
          .filter((tx) => tx.date.startsWith(ymStr))
          .reduce((s, tx) => s + tx.amount_cents, 0);
        points.push({ value: total / 100, label: t(`summary.months.${m}`) });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return { points, periodTotal, priorTotal };
  }, [range, catFilter, transactions]);

  const pct = percentChange(periodTotal, priorTotal);
  const pctStr = pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const pctColor = pct === null ? '#94A3B8' : pct > 0 ? '#EF4444' : '#22C55E';

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // 16px padding each side
  const n = points.length || 1;
  const spacing = Math.max(20, (chartWidth - 60) / n - 2);

  const maxVal = Math.max(...points.map((p) => p.value), 1);

  return (
    <View style={styles.container}>
      {/* ── Range selector ── */}
      <View style={styles.rangeBar}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, r === range && styles.rangeBtnSelected]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeBtnText, r === range && styles.rangeBtnTextSelected]}>
              {t(`trends.ranges.${r}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Period summary ── */}
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>{t('trends.periodTotal')}</Text>
          <Text style={styles.summaryTotal}>${formatCurrency(periodTotal)}</Text>
        </View>
        <View style={styles.changeBox}>
          <Text style={styles.changeLabel}>{t('trends.vsPrior')}</Text>
          <Text style={[styles.changeValue, { color: pctColor }]}>{pctStr}</Text>
          <Text style={styles.changeAbs}>
            {pct === null ? '' : `${pct >= 0 ? '+' : ''}$${formatCurrency(Math.abs(periodTotal - priorTotal))}`}
          </Text>
        </View>
      </View>

      {/* ── Category filter — stable wrapped grid ── */}
      <View style={styles.catPanel}>
        <View style={styles.catWrap}>
          {(['all', ...CATEGORY_KEYS] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, catFilter === cat && styles.catChipSelected]}
              onPress={() => setCatFilter(cat)}
            >
              <Text style={[styles.catChipText, catFilter === cat && styles.catChipTextSelected]}>
                {cat === 'all' ? t('trends.filterAll') : t(`categories.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Line chart — fixed, non-scrollable ── */}
      <View style={styles.chartArea}>
        {points.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('trends.noData')}</Text>
          </View>
        ) : (
          <LineChart
            key={`${range}-${catFilter}`}
            data={points}
            width={chartWidth}
            height={200}
            spacing={spacing}
            color="#2563EB"
            thickness={2.5}
            hideDataPoints={false}
            dataPointsColor="#2563EB"
            dataPointsRadius={5}
            noOfSections={4}
            maxValue={Math.ceil(maxVal / 10) * 10 || 10}
            yAxisTextStyle={{ color: '#94A3B8', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#64748B', fontSize: 9 }}
            xAxisColor="#E2E8F0"
            yAxisColor="#E2E8F0"
            rulesColor="#F1F5F9"
            isAnimated={false}
            pointerConfig={{
              pointerStripUptoDataPoint: true,
              pointerStripColor: '#94A3B8',
              pointerStripWidth: 1,
              pointerColor: '#2563EB',
              radius: 6,
              pointerLabelWidth: 110,
              pointerLabelHeight: 44,
              activatePointersOnLongPress: false,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any[]) => (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipLabel}>{items[0]?.label}</Text>
                  <Text style={styles.tooltipValue}>${formatCurrency(Math.round((items[0]?.value ?? 0) * 100))}</Text>
                </View>
              ),
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  rangeBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  rangeBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, marginHorizontal: 2 },
  rangeBtnSelected: { backgroundColor: '#2563EB' },
  rangeBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  rangeBtnTextSelected: { color: '#fff' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, backgroundColor: '#EFF6FF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#BFDBFE' },
  summaryLabel: { fontSize: 12, color: '#1E40AF' },
  summaryTotal: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  changeBox: { alignItems: 'flex-end' },
  changeLabel: { fontSize: 11, color: '#94A3B8' },
  changeValue: { fontSize: 18, fontWeight: '700' },
  changeAbs: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // Stable wrapped category chips — uniform fontWeight prevents reflow
  catPanel: { backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  catChipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  // fontWeight is the SAME in both states — prevents chip width change on select
  catChipText: { fontSize: 12, fontWeight: '500', color: '#475569' },
  catChipTextSelected: { fontSize: 12, fontWeight: '500', color: '#fff' },

  chartArea: { flex: 1, paddingHorizontal: 16, paddingTop: 16, justifyContent: 'flex-start' },

  tooltip: { backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  tooltipLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 2 },
  tooltipValue: { fontSize: 14, fontWeight: '700', color: '#fff' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#94A3B8' },
});
