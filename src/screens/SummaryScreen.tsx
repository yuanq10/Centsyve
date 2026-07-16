import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CATEGORY_KEYS, CategoryKey } from '../db/database';
import { getMonthlyCategorySums } from '../db/transactions';
import { useTransactionStore } from '../store/useTransactionStore';
import { t } from '../i18n';
import { formatCurrency } from '../utils/formatting';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function SummaryScreen() {
  const transactions = useTransactionStore((s) => s.transactions);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<number>(transactions.map((tx) => parseInt(tx.date.slice(0, 4), 10)));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Build pivot: month → category → cents
  const pivot = useMemo(() => {
    const sums = getMonthlyCategorySums(year);
    const map: Record<number, Record<string, number>> = {};
    for (const row of sums) {
      if (!map[row.month]) map[row.month] = {};
      map[row.month][row.category] = row.total_cents;
    }
    return map;
  }, [year, transactions]);

  function rowTotal(month: number): number {
    return CATEGORY_KEYS.reduce((s, cat) => s + (pivot[month]?.[cat] ?? 0), 0);
  }

  function colTotal(cat: CategoryKey): number {
    return MONTHS.reduce((s, m) => s + (pivot[m]?.[cat] ?? 0), 0);
  }

  const annualTotal = MONTHS.reduce((s, m) => s + rowTotal(m), 0);
  const hasData = annualTotal > 0;

  const CELL_W = 80;
  const LABEL_W = 72;
  const TOTAL_W = 88;

  return (
    <View style={styles.container}>
      {/* Year selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearBar} contentContainerStyle={styles.yearBarContent}>
        {availableYears.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearChip, y === year && styles.yearChipSelected]}
            onPress={() => setYear(y)}
          >
            <Text style={[styles.yearChipText, y === year && styles.yearChipTextSelected]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!hasData ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('summary.empty', { year })}</Text>
        </View>
      ) : (
        <ScrollView horizontal style={styles.tableScroll}>
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={[styles.cell, { width: LABEL_W }]} />
              {CATEGORY_KEYS.map((cat) => (
                <View key={cat} style={[styles.cell, styles.headerCell, { width: CELL_W }]}>
                  <Text style={styles.headerText} numberOfLines={2}>
                    {t(`categories.${cat}`)}
                  </Text>
                </View>
              ))}
              <View style={[styles.cell, styles.headerCell, { width: TOTAL_W }]}>
                <Text style={styles.headerText}>{t('summary.total')}</Text>
              </View>
            </View>

            {/* Month rows */}
            <ScrollView style={styles.tableBody}>
              {MONTHS.map((m) => {
                const rTotal = rowTotal(m);
                return (
                  <View key={m} style={[styles.row, m % 2 === 0 && styles.rowAlt]}>
                    <View style={[styles.cell, styles.monthCell, { width: LABEL_W }]}>
                      <Text style={styles.monthText}>{t(`summary.months.${m}`)}</Text>
                    </View>
                    {CATEGORY_KEYS.map((cat) => {
                      const cents = pivot[m]?.[cat] ?? 0;
                      return (
                        <View key={cat} style={[styles.cell, { width: CELL_W }]}>
                          <Text style={styles.cellText}>
                            {cents === 0 ? '–' : `$${formatCurrency(cents)}`}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={[styles.cell, styles.totalCell, { width: TOTAL_W }]}>
                      <Text style={styles.totalText}>
                        {rTotal === 0 ? '–' : `$${formatCurrency(rTotal)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Annual total row */}
              <View style={[styles.row, styles.annualRow]}>
                <View style={[styles.cell, styles.monthCell, { width: LABEL_W }]}>
                  <Text style={styles.annualLabel}>{t('summary.annualTotal')}</Text>
                </View>
                {CATEGORY_KEYS.map((cat) => {
                  const cents = colTotal(cat);
                  return (
                    <View key={cat} style={[styles.cell, { width: CELL_W }]}>
                      <Text style={styles.annualText}>
                        {cents === 0 ? '–' : `$${formatCurrency(cents)}`}
                      </Text>
                    </View>
                  );
                })}
                <View style={[styles.cell, styles.totalCell, { width: TOTAL_W }]}>
                  <Text style={styles.annualText}>${formatCurrency(annualTotal)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  yearBar: { maxHeight: 44, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  yearBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  yearChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  yearChipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  yearChipText: { fontSize: 13, color: '#475569' },
  yearChipTextSelected: { color: '#fff', fontWeight: '600' },

  tableScroll: { flex: 1 },

  headerRow: { flexDirection: 'row', backgroundColor: '#1E40AF' },
  headerCell: { backgroundColor: '#1E40AF', borderColor: '#3B82F6' },
  headerText: { fontSize: 11, color: '#fff', fontWeight: '700', textAlign: 'center' },

  tableBody: {},

  row: { flexDirection: 'row', backgroundColor: '#fff' },
  rowAlt: { backgroundColor: '#F8FAFC' },
  annualRow: { backgroundColor: '#EFF6FF', borderTopWidth: 2, borderTopColor: '#2563EB' },

  cell: { padding: 8, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E2E8F0', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', minHeight: 38 },
  monthCell: { alignItems: 'flex-start', backgroundColor: 'transparent' },
  totalCell: { backgroundColor: '#EFF6FF' },

  monthText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  cellText: { fontSize: 12, color: '#334155', textAlign: 'right' },
  totalText: { fontSize: 12, fontWeight: '700', color: '#1E40AF', textAlign: 'right' },
  annualLabel: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  annualText: { fontSize: 12, fontWeight: '700', color: '#1E40AF', textAlign: 'right' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#94A3B8' },
});
