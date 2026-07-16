import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { CategoryKey, RecurringRule } from '../db/database';
import { t } from '../i18n';
import { todayISO, parseCurrencyInput, formatCurrency } from '../utils/formatting';
import CategoryPicker from './CategoryPicker';
import DatePickerInput from './DatePickerInput';

interface Props {
  visible: boolean;
  initial?: RecurringRule;
  onSave: (data: {
    name: string;
    category: CategoryKey;
    amount_cents: number;
    day_of_month: number;
    start_date: string;
    end_date: string | null;
  }) => void;
  onCancel: () => void;
}

export default function RecurringForm({ visible, initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<CategoryKey | null>(initial?.category ?? null);
  const [amountStr, setAmountStr] = useState(initial ? formatCurrency(initial.amount_cents) : '');
  const [dayStr, setDayStr] = useState(initial ? String(initial.day_of_month) : '1');
  const [startDate, setStartDate] = useState(initial?.start_date ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.end_date ?? todayISO());
  const [hasEndDate, setHasEndDate] = useState(!!initial?.end_date);

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setCategory(initial?.category ?? null);
      setAmountStr(initial ? formatCurrency(initial.amount_cents) : '');
      setDayStr(initial ? String(initial.day_of_month) : '1');
      setStartDate(initial?.start_date ?? todayISO());
      setEndDate(initial?.end_date ?? todayISO());
      setHasEndDate(!!initial?.end_date);
    }
  }, [visible]);

  function handleSave() {
    if (!name.trim()) { Alert.alert(t('common.error'), t('recurring.name')); return; }
    if (!category) { Alert.alert(t('common.error'), t('recurring.category')); return; }
    const cents = parseCurrencyInput(amountStr);
    if (cents === null || cents === 0) { Alert.alert(t('common.error'), t('recurring.amount')); return; }
    const day = parseInt(dayStr, 10);
    if (isNaN(day) || day < 1 || day > 28) { Alert.alert(t('common.error'), t('recurring.dayOfMonth')); return; }

    onSave({
      name: name.trim(),
      category,
      amount_cents: cents,
      day_of_month: day,
      start_date: startDate,
      end_date: hasEndDate ? endDate : null,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.headerBtn}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {initial ? t('recurring.edit') : t('recurring.add')}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.headerBtn, styles.saveBtn]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('recurring.name')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('recurring.namePlaceholder')} />

          <Text style={styles.label}>{t('recurring.amount')}</Text>
          <TextInput style={styles.input} value={amountStr} onChangeText={setAmountStr} placeholder={t('recurring.amountPlaceholder')} keyboardType="decimal-pad" />

          <Text style={styles.label}>{t('recurring.dayOfMonth')} (1–28)</Text>
          <TextInput style={styles.input} value={dayStr} onChangeText={setDayStr} keyboardType="number-pad" />

          <DatePickerInput
            label={t('recurring.startDate')}
            value={startDate}
            onChange={setStartDate}
          />

          <View style={styles.endDateRow}>
            <Text style={styles.label}>{t('recurring.endDate')}</Text>
            <Switch value={hasEndDate} onValueChange={setHasEndDate} />
          </View>
          {hasEndDate && (
            <DatePickerInput
              value={endDate}
              onChange={setEndDate}
              minDate={startDate}
            />
          )}

          <Text style={styles.label}>{t('recurring.category')}</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerBtn: { fontSize: 16, color: '#2563EB' },
  saveBtn: { fontWeight: '600' },
  body: { padding: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#F8FAFC', color: '#1E293B' },
  endDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
});
