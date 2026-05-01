import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { createTransaction } from "../api/transactions";
import { addToPendingQueue } from "../services/offlineStorage";
import { useNetwork } from "../context/NetworkContext";
import DateInput from "../components/DateInput";

const CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Bills", "Salary", "Freelance", "Other"];

export default function AddTransactionScreen({ navigation }) {
  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);
  const { reportOnline, reportOffline } = useNetwork();

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    const txData = {
      type,
      amount: parsedAmount,
      merchant: merchant || null,
      description: description || null,
      date: dateStr || null,
      category,
    };
    try {
      await createTransaction(txData);
      reportOnline();
      Alert.alert("Saved!", "Transaction recorded.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (!e.response) {
        reportOffline();
        await addToPendingQueue(txData);
        Alert.alert(
          "Saved Locally",
          "You're offline. This transaction will sync automatically when you reconnect.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", "Could not save transaction.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Transaction</Text>

        {/* Type Toggle */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, type === "income" && styles.typeButtonIncomeActive]}
            onPress={() => setType("income")}
          >
            <Text style={[styles.typeText, type === "income" && styles.typeTextActive]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === "expense" && styles.typeButtonExpenseActive]}
            onPress={() => setType("expense")}
          >
            <Text style={[styles.typeText, type === "expense" && styles.typeTextActive]}>Expense</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Amount ($)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Date</Text>
        <DateInput value={dateStr} onChangeText={setDateStr} />

        <Text style={styles.label}>Merchant / Source</Text>
        <TextInput
          style={styles.input}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Walmart, Employer"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Notes..."
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipSelected]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, type === "expense" && styles.saveButtonExpense]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Transaction</Text>}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f9f9f9", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 24 },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  typeButtonIncomeActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  typeButtonExpenseActive: { backgroundColor: "#c62828", borderColor: "#c62828" },
  typeText: { fontWeight: "600", color: "#555" },
  typeTextActive: { color: "#fff" },
  label: { fontSize: 13, color: "#666", marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ccc", backgroundColor: "#fff" },
  chipSelected: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  chipText: { fontSize: 13, color: "#555" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  saveButton: { backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveButtonExpense: { backgroundColor: "#c62828" },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
