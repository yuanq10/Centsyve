import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getDb, CATEGORY_KEYS, CategoryKey, dollarsToCents } from '../db/database';
import { getAllTransactions, createTransaction, deleteTransaction } from '../db/transactions';
import { useTransactionStore } from '../store/useTransactionStore';
import { useLocaleStore } from '../store/useLocaleStore';
import { t } from '../i18n';
import { todayISO } from '../utils/formatting';

// Map both English display names and Chinese spreadsheet names → DB keys
const CATEGORY_ALIASES: Record<string, CategoryKey> = {
  rent: 'rent', Rent: 'rent', 房租: 'rent',
  utilities: 'utilities', 'Utilities & Internet': 'utilities', 水电网络费: 'utilities', 水电网络: 'utilities',
  phone: 'phone', Phone: 'phone', 通讯费: 'phone', 手机费: 'phone',
  commute: 'commute', Commute: 'commute', 通勤费: 'commute', 交通: 'commute',
  car: 'car', Car: 'car', 汽车费用: 'car', 汽车: 'car',
  daily: 'daily', 'Daily Living': 'daily', 日常生活: 'daily', 日常: 'daily',
  other: 'other', Other: 'other', 其他: 'other',
};

function resolveCategory(raw: string): CategoryKey | null {
  return CATEGORY_ALIASES[raw.trim()] ?? null;
}

function buildCsv(txs: ReturnType<typeof getAllTransactions>): string {
  const header = 'Year,Month,Day,Item,Category,Amount\n';
  const rows = txs.map((tx) => {
    const [y, m, d] = tx.date.split('-');
    const amount = (tx.amount_cents / 100).toFixed(2);
    return `${y},${m},${d},"${tx.item.replace(/"/g, '""')}",${tx.category},${amount}`;
  });
  return header + rows.join('\n');
}

export default function SettingsScreen() {
  const loadTransactions = useTransactionStore((s) => s.load);
  const { locale, setLocale } = useLocaleStore();

  async function handleExportCsv() {
    try {
      const txs = getAllTransactions();
      const csv = buildCsv(txs);
      const path = FileSystem.cacheDirectory + `centsyve_${todayISO()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
      }
      Alert.alert(t('settings.exportSuccess'));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e));
    }
  }

  async function handleImportCsv() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (result.canceled) return;
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const lines = text.split(/\r?\n/).filter(Boolean);
      const dataLines = lines[0].startsWith('Year') ? lines.slice(1) : lines;

      let imported = 0;
      const db = getDb();
      db.withTransactionSync(() => {
        for (const line of dataLines) {
          const cols = parseCsvLine(line);
          if (cols.length < 6) continue;
          const [year, month, day, item, categoryRaw, amountRaw] = cols;
          const date = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const category = resolveCategory(categoryRaw);
          if (!category) continue;
          const amount = parseFloat(amountRaw);
          if (isNaN(amount)) continue;
          createTransaction({ date, item, category, amount_cents: dollarsToCents(amount) });
          imported++;
        }
      });
      loadTransactions();
      Alert.alert(t('settings.importSuccess', { count: imported }));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e));
    }
  }

  async function handleBackupJson() {
    try {
      const txs = getAllTransactions();
      const json = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), transactions: txs }, null, 2);
      const path = FileSystem.cacheDirectory + `centsyve_backup_${todayISO()}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Backup JSON' });
      }
      Alert.alert(t('settings.backupSuccess'));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e));
    }
  }

  async function handleRestoreJson() {
    Alert.alert(t('settings.restoreConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (result.canceled) return;
            const text = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
            const data = JSON.parse(text);
            if (!Array.isArray(data.transactions)) throw new Error('Invalid backup format');

            const db = getDb();
            db.withTransactionSync(() => {
              const existing = getAllTransactions();
              for (const tx of existing) deleteTransaction(tx.id);
              for (const tx of data.transactions) {
                createTransaction({
                  date: tx.date,
                  item: tx.item,
                  category: tx.category,
                  amount_cents: tx.amount_cents,
                  recurring_id: tx.recurring_id,
                });
              }
            });
            loadTransactions();
            Alert.alert(t('settings.restoreSuccess'));
          } catch (e: any) {
            Alert.alert(t('common.error'), String(e));
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>{t('settings.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CSV</Text>

        <TouchableOpacity style={styles.row} onPress={handleExportCsv}>
          <Text style={styles.rowLabel}>{t('settings.exportCsv')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleImportCsv}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>{t('settings.importCsv')}</Text>
            <Text style={styles.rowHint}>{t('settings.importHint')}</Text>
          </View>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>JSON Backup</Text>

        <TouchableOpacity style={styles.row} onPress={handleBackupJson}>
          <Text style={styles.rowLabel}>{t('settings.backupJson')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleRestoreJson}>
          <Text style={styles.rowLabel}>{t('settings.restoreJson')}</Text>
          <Text style={[styles.rowArrow, { color: '#EF4444' }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.language')}</Text>

        <TouchableOpacity style={styles.row} onPress={() => setLocale('en')}>
          <Text style={styles.rowLabel}>{t('settings.languageEnglish')}</Text>
          {locale === 'en' && <Text style={styles.activeIndicator}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => setLocale('zh')}>
          <Text style={styles.rowLabel}>{t('settings.languageChinese')}</Text>
          {locale === 'zh' && <Text style={styles.activeIndicator}>✓</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 16 },
  sectionHeader: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 4 },

  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginLeft: 16 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 16, color: '#1E293B' },
  rowHint: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  rowHintInline: { fontSize: 12, color: '#94A3B8' },
  rowArrow: { fontSize: 20, color: '#CBD5E1' },
  activeIndicator: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
});
