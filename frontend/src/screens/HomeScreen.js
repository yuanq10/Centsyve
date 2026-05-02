import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useNetwork } from "../context/NetworkContext";
import { getSummary, getTrends } from "../api/dashboard";
import { listTransactions, createTransaction } from "../api/transactions";
import {
  getCachedTransactions,
  getPendingQueue,
  clearPendingQueue,
  computeSummary,
} from "../services/offlineStorage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PERIODS = ["weekly", "monthly", "yearly"];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { isOnline, reportOnline, reportOffline } = useNetwork();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Flush any transactions that were created while offline.
  const syncPending = async () => {
    const queue = await getPendingQueue();
    if (queue.length === 0) return;
    try {
      for (const tx of queue) {
        const { _offlineId, _pending, ...data } = tx;
        await createTransaction(data);
      }
      await clearPendingQueue();
    } catch {
      // Stay silent — will retry on next successful load.
    }
  };

  const loadData = useCallback(async (selectedPeriod = period) => {
    try {
      await syncPending();
      const [summaryRes, trendsRes, txRes] = await Promise.all([
        getSummary(),
        getTrends(selectedPeriod),
        listTransactions(),
      ]);
      reportOnline();
      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setRecentTx(txRes.data.slice(0, 5));
    } catch (e) {
      if (!e.response) {
        // Network error — fall back to local cache.
        reportOffline();
        const cached = await getCachedTransactions();
        const pending = await getPendingQueue();
        const all = [...pending, ...cached];
        setSummary(computeSummary(all));
        setTrends(null);
        setRecentTx(all.slice(0, 5));
      }
      // Server errors: keep whatever is already on screen.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handlePeriodChange = (p) => {
    setPeriod(p);
    loadData(p);
  };

  const handleOneTapScan = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow camera access to scan receipts.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      navigation.navigate("ScanReceipt", { prefetchedAsset: result.assets[0] });
    }
  };

  const chartData = trends && trends.labels.length > 0 ? {
    labels: trends.labels,
    datasets: [
      { data: trends.income.map(v => v || 0), color: () => "#2e7d32", strokeWidth: 2 },
      { data: trends.expenses.map(v => v || 0), color: () => "#c62828", strokeWidth: 2 },
    ],
    legend: ["Income", "Expenses"],
  } : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            You're offline — showing cached data. New transactions will sync when you reconnect.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, styles.balanceCard]}>
          <Text style={styles.cardLabel}>Balance</Text>
          <Text style={styles.cardValueLarge}>${summary?.balance?.toFixed(2) ?? "0.00"}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <TouchableOpacity style={[styles.card, styles.incomeCard]} onPress={() => navigation.navigate("Transactions", { filter: "Income" })} activeOpacity={0.8}>
          <Text style={styles.cardLabel}>Income</Text>
          <Text style={[styles.cardValue, { color: "#2e7d32" }]}>${summary?.total_income?.toFixed(2) ?? "0.00"}</Text>
          <Text style={styles.cardManageLink}>Manage →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, styles.expenseCard]} onPress={() => navigation.navigate("Transactions", { filter: "Expense" })} activeOpacity={0.8}>
          <Text style={styles.cardLabel}>Expenses</Text>
          <Text style={[styles.cardValue, { color: "#c62828" }]}>${summary?.total_expenses?.toFixed(2) ?? "0.00"}</Text>
          <Text style={styles.cardManageLink}>Manage →</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trends Chart */}
      {!isOnline ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Chart unavailable offline</Text>
        </View>
      ) : chartData ? (
        <View style={styles.chartBox}>
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 32}
            height={200}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
              labelColor: () => "#888",
              propsForDots: { r: "3" },
            }}
            bezier
            style={{ borderRadius: 12 }}
            withVerticalLines={false}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data yet for this period</Text>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
            <Text style={styles.sectionLink}>Manage</Text>
          </TouchableOpacity>
        </View>
        {recentTx.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          recentTx.map((tx) => (
            <View key={tx.id ?? tx._offlineId} style={styles.txRow}>
              <View>
                <Text style={styles.txMerchant}>
                  {tx.merchant || tx.category || "Transaction"}
                  {tx._pending ? <Text style={styles.pendingLabel}> (pending)</Text> : null}
                </Text>
                <Text style={styles.txDate}>{tx.date || "—"}</Text>
              </View>
              <Text style={[styles.txAmount, tx.type === "income" ? styles.incomeText : styles.expenseText]}>
                {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleOneTapScan}>
          <Text style={styles.actionButtonText}>📷  Scan Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]} onPress={() => navigation.navigate("AddTransaction")}>
          <Text style={[styles.actionButtonText, { color: "#2e7d32" }]}>＋  Add Transaction</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.aiButton, { backgroundColor: "#1b5e20" }]} onPress={() => navigation.navigate("Goals")}>
        <Text style={styles.aiButtonText}>🎯  My Goals</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.aiButton, { marginTop: 8 }]} onPress={() => navigation.navigate("AIAdvisor")}>
        <Text style={styles.aiButtonText}>🤖  AI Financial Advisor</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 56, backgroundColor: "#fff" },
  greeting: { fontSize: 13, color: "#888" },
  email: { fontSize: 16, fontWeight: "700", color: "#222" },
  logoutText: { fontSize: 13, color: "#c62828" },
  cardRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 16 },
  card: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  balanceCard: { alignItems: "center", paddingVertical: 20 },
  incomeCard: {},
  expenseCard: {},
  cardLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: "700" },
  cardManageLink: { fontSize: 11, color: "#888", marginTop: 6 },
  cardValueLarge: { fontSize: 32, fontWeight: "700", color: "#222" },
  periodRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 20 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  periodChipActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  periodText: { fontSize: 13, color: "#555" },
  periodTextActive: { color: "#fff", fontWeight: "600" },
  chartBox: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 12, padding: 8 },
  emptyChart: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 12, padding: 32, alignItems: "center" },
  emptyText: { color: "#aaa", fontSize: 14 },
  section: { marginHorizontal: 16, marginTop: 20, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  sectionLink: { fontSize: 13, color: "#2e7d32", fontWeight: "600" },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  txMerchant: { fontSize: 14, fontWeight: "600", color: "#222" },
  txDate: { fontSize: 12, color: "#aaa", marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: "700" },
  incomeText: { color: "#2e7d32" },
  expenseText: { color: "#c62828" },
  actionRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 20 },
  actionButton: { flex: 1, backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  actionButtonOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2e7d32" },
  actionButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  aiButton: { marginHorizontal: 16, marginTop: 12, backgroundColor: "#1a237e", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  aiButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  offlineBanner: { backgroundColor: "#e65100", paddingVertical: 8, paddingHorizontal: 16 },
  offlineBannerText: { color: "#fff", fontSize: 12, textAlign: "center" },
  pendingLabel: { color: "#e65100", fontSize: 11, fontWeight: "400" },
});
