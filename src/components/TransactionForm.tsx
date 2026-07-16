import React, { useState } from 'react';
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
} from 'react-native';
import { CategoryKey } from '../db/database';
import { t } from '../i18n';
import { todayISO, parseCurrencyInput, formatCurrency } from '../utils/formatting';
import CategoryPicker from './CategoryPicker';
import DatePickerInput from './DatePickerInput';

interface Props {
  visible: boolean;
  initial?: {
    date: string;
    item: string;
    category: CategoryKey;
    amount_cents: number;
  };
  onSave: (data: { date: string; item: string; category: CategoryKey; amount_cents: number }) => void;
  onCancel: () => void;
}

export default function TransactionForm({ visible, initial, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [item, setItem] = useState(initial?.item ?? '');
  const [category, setCategory] = useState<CategoryKey | null>(initial?.category ?? null);
  const [amountStr, setAmountStr] = useState(
    initial ? formatCurrency(initial.amount_cents) : ''
  );

  React.useEffect(() => {
    if (visible) {
      setDate(initial?.date ?? todayISO());
      setItem(initial?.item ?? '');
      setCategory(initial?.category ?? null);
      setAmountStr(initial ? formatCurrency(initial.amount_cents) : '');
    }
  }, [visible, initial?.date, initial?.item, initial?.category, initial?.amount_cents]);

  function handleSave() {
    if (!item.trim()) {
      Alert.alert(t('common.error'), t('transactions.itemPlaceholder'));
      return;
    }
    if (!category) {
      Alert.alert(t('common.error'), t('transactions.category'));
      return;
    }
    const cents = parseCurrencyInput(amountStr);
    if (cents === null || cents === 0) {
      Alert.alert(t('common.error'), t('transactions.amountPlaceholder'));
      return;
    }
    onSave({ date, item: item.trim(), category, amount_cents: cents });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.headerBtn}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {initial ? t('transactions.edit') : t('transactions.add')}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.headerBtn, styles.saveBtn]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <DatePickerInput
            label={t('transactions.date')}
            value={date}
            onChange={setDate}
          />

          <Text style={styles.label}>{t('transactions.item')}</Text>
          <TextInput
            style={styles.input}
            value={item}
            onChangeText={setItem}
            placeholder={t('transactions.itemPlaceholder')}
            autoCapitalize="words"
          />

          <Text style={styles.label}>{t('transactions.amount')}</Text>
          <TextInput
            style={styles.input}
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder={t('transactions.amountPlaceholder')}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>{t('transactions.category')}</Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerBtn: { fontSize: 16, color: '#2563EB' },
  saveBtn: { fontWeight: '600' },
  body: { padding: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
});
