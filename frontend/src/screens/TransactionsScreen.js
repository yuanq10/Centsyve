import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listTransactions, deleteTransaction } from "../api/transactions";
import { cacheTransactions } from "../services/offlineStorage";

const FILTERS = ["All", "Income", "Expense"];

export default function TransactionsScreen({ navigation, route }) {
  const initialFilter = route.params?.filter ?? "All";
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState(initialFilter);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await listTransactions();
      setTransactions(data);
    } catch {
      Alert.alert("Error", "Could not load transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (tx) => {
    Alert.alert(
      "Delete Transaction",
      `Delete "${tx.merchant || tx.category || "this transaction"}" ($${tx.amount.toFixed(2)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            try {
              await deleteTransaction(tx.id);
              const updated = transactions.filter((t) => t.id !== tx.id);
              setTransactions(updated);
              await cacheTransactions(updated);
              if (expandedId === tx.id) setExpandedId(null);
            } catch {
              Alert.alert("Error", "Could not delete transaction.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (tx) => {
    navigation.navigate("AddTransaction", { transaction: tx });
  };

  const filtered = transactions.filter((tx) => {
    if (filter === "Income") return tx.type === "income";
    if (filter === "Expense") return tx.type === "expense";
    return true;
  });

  const renderItem = ({ item: tx }) => {
    const expanded = expandedId === tx.id;
    const isIncome = tx.type === "income";
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => setExpandedId(expanded ? null : tx.id)} activeOpacity={0.8}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.merchant}>{tx.merchant || tx.category || "Transaction"}</Text>
              <Text style={styles.meta}>
                {tx.date || "—"}  •  {tx.category || "Uncategorised"}
              </Text>
            </View>
            <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
              {isIncome ? "+" : "-"}${tx.amount.toFixed(2)}
            </Text>
            <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.actions}>
            {tx.description ? (
              <Text style={styles.description}>{tx.description}</Text>
            ) : null}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(tx)}>
                <Text style={styles.editBtnText}>✏️  Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(tx)}>
                <Text style={styles.deleteBtnText}>🗑  Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); setExpandedId(null); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(tx) => String(tx.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff" },
  filterChipActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  filterText: { fontSize: 13, color: "#555" },
  filterTextActive: { color: "#fff", fontWeight: "600" },

  list: { padding: 12, flexGrow: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { color: "#aaa", fontSize: 15 },

  card: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  rowLeft: { flex: 1 },
  merchant: { fontSize: 15, fontWeight: "600", color: "#222" },
  meta: { fontSize: 12, color: "#aaa", marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700" },
  income: { color: "#2e7d32" },
  expense: { color: "#c62828" },
  chevron: { color: "#bbb", fontSize: 11 },

  actions: { borderTopWidth: 1, borderTopColor: "#f0f0f0", padding: 12 },
  description: { fontSize: 13, color: "#666", marginBottom: 10 },
  actionButtons: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: "#e8f5e9", alignItems: "center",
  },
  editBtnText: { color: "#2e7d32", fontWeight: "600", fontSize: 14 },
  deleteBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: "#ffebee", alignItems: "center",
  },
  deleteBtnText: { color: "#c62828", fontWeight: "600", fontSize: 14 },
});
