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
import * as XLSX from 'xlsx';
import { getDb, CategoryKey, dollarsToCents } from '../db/database';
import { getAllTransactions, createTransaction } from '../db/transactions';
import { useTransactionStore } from '../store/useTransactionStore';
import { useLocaleStore } from '../store/useLocaleStore';
import { t } from '../i18n';
import { todayISO } from '../utils/formatting';

// Map both English and Chinese category names (current + legacy spreadsheet labels) → DB keys
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

function buildCsv(txs: ReturnType<typeof getAllTransactions>, locale: string): string {
  const header = locale === 'zh' ? '年,月,日,项目,种类,金额\n' : 'Year,Month,Day,Item,Category,Amount\n';
  const rows = txs.map((tx) => {
    const [y, m, d] = tx.date.split('-');
    const amount = (tx.amount_cents / 100).toFixed(2);
    const category = t(`categories.${tx.category}`);
    return `${y},${m},${d},"${tx.item.replace(/"/g, '""')}",${category},${amount}`;
  });
  return header + rows.join('\n');
}

/** First row is a header (not data) if its first cell isn't a plausible 4-digit year. */
function isHeaderRow(cols: unknown[]): boolean {
  const first = String(cols?.[0] ?? '').trim();
  return !/^\d{4}$/.test(first);
}

export default function SettingsScreen() {
  const loadTransactions = useTransactionStore((s) => s.load);
  const { locale, setLocale } = useLocaleStore();

  async function handleExportCsv() {
    try {
      const txs = getAllTransactions();
      const csv = buildCsv(txs, locale);
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

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      const isExcel = /\.xlsx?$/i.test(file.name ?? '');

      let rows: unknown[][];
      if (isExcel) {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const workbook = XLSX.read(base64, { type: 'base64' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
        rows = text.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
      }

      const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;

      let imported = 0;
      const db = getDb();
      db.withTransactionSync(() => {
        for (const cols of dataRows) {
          if (!cols || cols.length < 6) continue;
          const [yearRaw, monthRaw, dayRaw, itemRaw, categoryRaw, amountRaw] = cols.map((c) => String(c ?? '').trim());
          const year = parseInt(yearRaw, 10);
          const month = parseInt(monthRaw, 10);
          const day = parseInt(dayRaw, 10);
          if (!year || !month || !day) continue;
          const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const category = resolveCategory(categoryRaw);
          if (!category) continue;
          const amount = parseFloat(amountRaw);
          if (isNaN(amount)) continue;
          createTransaction({ date, item: itemRaw, category, amount_cents: dollarsToCents(amount) });
          imported++;
        }
      });
      loadTransactions();
      Alert.alert(t('settings.importSuccess', { count: imported }));
    } catch (e: any) {
      Alert.alert(t('common.error'), String(e));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>{t('settings.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.dataSection')}</Text>

        <TouchableOpacity style={styles.row} onPress={handleExportCsv}>
          <Text style={styles.rowLabel}>{t('settings.exportCsv')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleImport}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>{t('settings.import')}</Text>
            <Text style={styles.rowHint}>{t('settings.importHint')}</Text>
          </View>
          <Text style={styles.rowArrow}>›</Text>
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
  rowArrow: { fontSize: 20, color: '#CBD5E1' },
  activeIndicator: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
});
