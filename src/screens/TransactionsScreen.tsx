import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Transaction } from '../db/database';
import { useTransactionStore } from '../store/useTransactionStore';
import { t } from '../i18n';
import { formatCurrency, formatDate, groupBy } from '../utils/formatting';
import TransactionForm from '../components/TransactionForm';

function getYear(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

// 4 columns × 3 rows
const MONTH_ROWS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];

export default function TransactionsScreen() {
  const { transactions, add, update, remove } = useTransactionStore();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(now.getMonth() + 1);

  const minYear = useMemo(() => {
    const years = transactions.map((tx) => getYear(tx.date));
    return years.length > 0 ? Math.min(...years) : now.getFullYear();
  }, [transactions]);

  const maxYear = now.getFullYear();

  // Descending list of every year from minYear to maxYear
  const yearOptions = useMemo(() =>
    Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear]
  );

  const filtered = useMemo(() => {
    if (filterMonth === null) {
      return transactions.filter((tx) => getYear(tx.date) === filterYear);
    }
    const ym = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
    return transactions.filter((tx) => tx.date.startsWith(ym));
  }, [transactions, filterYear, filterMonth]);

  const grouped = useMemo(() => {
    const g = groupBy(filtered, (tx) => tx.date);
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  function openAdd() { setEditing(null); setFormVisible(true); }
  function openEdit(tx: Transaction) { setEditing(tx); setFormVisible(true); }

  function handleSave(data: { date: string; item: string; category: any; amount_cents: number }) {
    if (editing) { update(editing.id, data); } else { add(data); }
    setFormVisible(false);
    setEditing(null);
  }

  function confirmDelete(tx: Transaction) {
    Alert.alert(t('transactions.deleteConfirm'), t('transactions.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove(tx.id) },
    ]);
  }

  function confirmSkip(tx: Transaction) {
    Alert.alert(t('transactions.skipConfirm'), t('transactions.skipConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), style: 'destructive', onPress: () => remove(tx.id) },
    ]);
  }

  function renderTransaction({ item: tx }: { item: Transaction }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.txRow, pressed && styles.txRowPressed]}
        onLongPress={() => openEdit(tx)}
      >
        <View style={styles.txLeft}>
          <Text style={styles.txItem}>{tx.item}</Text>
          <View style={styles.txMeta}>
            <Text style={styles.txCategory}>{t(`categories.${tx.category}`)}</Text>
            {tx.recurring_id !== null && (
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>{t('transactions.autoBadge')}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={styles.txAmount}>${formatCurrency(tx.amount_cents)}</Text>
          <View style={styles.txActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(tx)}>
              <Text style={styles.actionEdit}>{t('common.edit')}</Text>
            </TouchableOpacity>
            {tx.recurring_id !== null ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmSkip(tx)}>
                <Text style={styles.actionDelete}>{t('transactions.skipThisMonth')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(tx)}>
                <Text style={styles.actionDelete}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  function renderDayGroup([date, txs]: [string, Transaction[]]) {
    const dayTotal = txs.reduce((s, tx) => s + tx.amount_cents, 0);
    return (
      <View key={date} style={styles.dayGroup}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayDate}>{formatDate(date)}</Text>
          <Text style={styles.dayTotal}>${formatCurrency(dayTotal)}</Text>
        </View>
        <FlatList
          data={txs}
          keyExtractor={(tx) => String(tx.id)}
          renderItem={renderTransaction}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    );
  }

  const periodTotal = filtered.reduce((s, tx) => s + tx.amount_cents, 0);

  const periodLabel = filterMonth === null
    ? `All of ${filterYear}`
    : `${t(`summary.months.${filterMonth}`)} ${filterYear}`;

  return (
    <View style={styles.container}>
      {/* ── Filter panel ── */}
      <View style={styles.filterPanel}>

        {/* Year row */}
        <View style={styles.yearRow}>
          <Text style={styles.sectionLabel}>Year</Text>
          <TouchableOpacity style={styles.yearDropdownBtn} onPress={() => setYearDropdownOpen(true)}>
            <Text style={styles.yearDropdownText}>{filterYear}</Text>
            <Text style={styles.yearDropdownChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Month grid */}
        <View style={styles.monthSection}>
          <Text style={styles.sectionLabel}>Month</Text>
          <View style={styles.monthGrid}>
            {/* All button — full width */}
            <TouchableOpacity
              style={[styles.monthBtn, styles.monthBtnAll, filterMonth === null && styles.monthBtnSelected]}
              onPress={() => setFilterMonth(null)}
            >
              <Text style={[styles.monthBtnText, filterMonth === null && styles.monthBtnTextSelected]}>
                All
              </Text>
            </TouchableOpacity>

            {/* 4 × 3 month grid */}
            {MONTH_ROWS.map((row, ri) => (
              <View key={ri} style={styles.monthRow}>
                {row.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthBtn, m === filterMonth && styles.monthBtnSelected]}
                    onPress={() => setFilterMonth(m)}
                  >
                    <Text style={[styles.monthBtnText, m === filterMonth && styles.monthBtnTextSelected]}>
                      {t(`summary.months.${m}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Period total bar ── */}
      <View style={styles.periodBar}>
        <Text style={styles.periodLabel}>{periodLabel}</Text>
        <Text style={styles.periodTotal}>${formatCurrency(periodTotal)}</Text>
      </View>

      {/* ── Transaction list ── */}
      {grouped.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('transactions.noTransactions')}</Text>
          <Text style={styles.emptyHint}>{t('transactions.noTransactionsHint')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 90 }}>
          {grouped.map(renderDayGroup)}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* ── Year dropdown modal ── */}
      <Modal visible={yearDropdownOpen} transparent animationType="fade" onRequestClose={() => setYearDropdownOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setYearDropdownOpen(false)}>
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Select Year</Text>
            {yearOptions.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.dropdownItem, y === filterYear && styles.dropdownItemSelected]}
                onPress={() => { setFilterYear(y); setYearDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, y === filterYear && styles.dropdownItemTextSelected]}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <TransactionForm
        visible={formVisible}
        initial={editing ? {
          date: editing.date,
          item: editing.item,
          category: editing.category,
          amount_cents: editing.amount_cents,
        } : undefined}
        onSave={handleSave}
        onCancel={() => { setFormVisible(false); setEditing(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Filter panel
  filterPanel: { backgroundColor: '#fff', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.3, marginBottom: 6 },

  // Year row
  yearRow: { marginBottom: 10 },
  yearDropdownBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  yearDropdownText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  yearDropdownChevron: { fontSize: 12, color: '#64748B' },

  // Month section
  monthSection: {},
  monthGrid: { gap: 5 },
  monthRow: { flexDirection: 'row', gap: 5 },
  monthBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center' },
  monthBtnAll: { flex: 0, width: '100%', paddingVertical: 7 },
  monthBtnSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  monthBtnText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  monthBtnTextSelected: { color: '#fff', fontWeight: '500' },

  // Period total bar
  periodBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#EFF6FF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#BFDBFE' },
  periodLabel: { fontSize: 14, color: '#1E40AF', fontWeight: '500' },
  periodTotal: { fontSize: 14, color: '#1E40AF', fontWeight: '700' },

  // List
  list: { flex: 1 },
  dayGroup: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#F1F5F9', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  dayDate: { fontSize: 13, fontWeight: '600', color: '#475569' },
  dayTotal: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginLeft: 14 },

  txRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  txRowPressed: { backgroundColor: '#F1F5F9' },
  txLeft: { flex: 1 },
  txItem: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  txCategory: { fontSize: 12, color: '#94A3B8' },
  autoBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  autoBadgeText: { fontSize: 10, color: '#1D4ED8', fontWeight: '600' },
  txRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  txAmount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  txActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: { padding: 2 },
  actionEdit: { fontSize: 12, color: '#2563EB' },
  actionDelete: { fontSize: 12, color: '#EF4444' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#CBD5E1', textAlign: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32 },

  // Year dropdown modal
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropdownCard: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 0, minWidth: 180, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  dropdownTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textAlign: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0', letterSpacing: 0.3 },
  dropdownItem: { paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center' },
  dropdownItemSelected: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 18, color: '#334155', fontWeight: '500' },
  dropdownItemTextSelected: { color: '#2563EB', fontWeight: '700' },
});
