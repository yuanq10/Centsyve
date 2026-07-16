import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { RecurringRule } from '../db/database';
import { useRecurringStore } from '../store/useRecurringStore';
import { countTransactionsByRecurringId } from '../db/transactions';
import { t } from '../i18n';
import { formatCurrency } from '../utils/formatting';
import RecurringForm from '../components/RecurringForm';

function nextPostDate(rule: RecurringRule): string {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Find the next month/day that hasn't been posted yet
  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  if (rule.last_posted_month) {
    const [ly, lm] = rule.last_posted_month.split('-').map(Number);
    year = lm === 12 ? ly + 1 : ly;
    month = lm === 12 ? 1 : lm + 1;
  } else {
    // Start from rule's start month
    const [sy, sm] = rule.start_date.slice(0, 7).split('-').map(Number);
    year = sy;
    month = sm;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(rule.day_of_month, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function RecurringScreen() {
  const { rules, add, update, pause, remove } = useRecurringStore();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  function openAdd() { setEditing(null); setFormVisible(true); }
  function openEdit(rule: RecurringRule) { setEditing(rule); setFormVisible(true); }

  function handleSave(data: any) {
    if (editing) {
      update(editing.id, data);
    } else {
      add(data);
    }
    setFormVisible(false);
    setEditing(null);
  }

  function confirmDelete(rule: RecurringRule) {
    const count = countTransactionsByRecurringId(rule.id);
    const body = count > 0 ? t('recurring.deleteTransactions', { count }) : t('recurring.deleteConfirm');
    const buttons: any[] = [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('recurring.keepTransactions'), onPress: () => remove(rule.id, false) },
    ];
    if (count > 0) {
      buttons.push({ text: t('recurring.removeTransactions'), style: 'destructive', onPress: () => remove(rule.id, true) });
    }
    Alert.alert(t('recurring.deleteConfirm'), body, buttons);
  }

  function renderRule({ item: rule }: { item: RecurringRule }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.ruleName}>{rule.name}</Text>
            <Text style={styles.ruleMeta}>
              {t(`categories.${rule.category}`)} · ${formatCurrency(rule.amount_cents)}
            </Text>
            <Text style={styles.ruleSchedule}>{t('recurring.monthlyOnDay', { day: rule.day_of_month })}</Text>
            {!rule.is_paused && (
              <Text style={styles.ruleNext}>{t('recurring.nextPost', { date: nextPostDate(rule) })}</Text>
            )}
          </View>
          <Switch
            value={!rule.is_paused}
            onValueChange={(val) => pause(rule.id, !val)}
            trackColor={{ true: '#2563EB' }}
          />
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(rule)} style={styles.actionBtn}>
            <Text style={styles.actionEdit}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(rule)} style={styles.actionBtn}>
            <Text style={styles.actionDelete}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
        {!!rule.is_paused && (
          <View style={styles.pausedBanner}>
            <Text style={styles.pausedText}>{t('recurring.pause')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rules.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('recurring.noRules')}</Text>
          <Text style={styles.emptyHint}>{t('recurring.noRulesHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderRule}
          contentContainerStyle={{ padding: 12, gap: 10 }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      <RecurringForm
        visible={formVisible}
        initial={editing ?? undefined}
        onSave={handleSave}
        onCancel={() => { setFormVisible(false); setEditing(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  ruleName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  ruleMeta: { fontSize: 13, color: '#64748B', marginTop: 3 },
  ruleSchedule: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  ruleNext: { fontSize: 12, color: '#2563EB', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9', paddingTop: 8 },
  actionBtn: {},
  actionEdit: { fontSize: 13, color: '#2563EB' },
  actionDelete: { fontSize: 13, color: '#EF4444' },
  pausedBanner: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 8 },
  pausedText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#CBD5E1', textAlign: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
