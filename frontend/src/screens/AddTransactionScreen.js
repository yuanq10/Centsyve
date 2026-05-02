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
import * as ImagePicker from "expo-image-picker";
import { createTransaction, updateTransaction, scanReceipt } from "../api/transactions";
import { addToPendingQueue } from "../services/offlineStorage";
import { useNetwork } from "../context/NetworkContext";
import DateInput from "../components/DateInput";

const CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Bills", "Salary", "Freelance", "Other"];

export default function AddTransactionScreen({ navigation, route }) {
  const existing = route.params?.transaction ?? null;
  const isEdit = existing !== null;

  const [type, setType] = useState(existing?.type ?? "expense");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [merchant, setMerchant] = useState(existing?.merchant ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [dateStr, setDateStr] = useState(existing?.date ?? new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState(existing?.category ?? "Other");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const { reportOnline, reportOffline } = useNetwork();

  const applyScannedData = (data) => {
    const filled = [];
    if (data.amount)    { setAmount(String(data.amount));  filled.push("amount"); }
    if (data.date)      { setDateStr(data.date);            filled.push("date"); }
    if (data.merchant)  { setMerchant(data.merchant);       filled.push("merchant"); }
    if (data.suggested_category && data.suggested_category !== "Other") {
      setCategory(data.suggested_category);
      filled.push("category");
    }
    if (data.amount) setType("expense"); // receipts are always expenses
    setScanNote(filled.length > 0
      ? `Auto-filled: ${filled.join(", ")}. Review before saving.`
      : "Receipt scanned but no fields could be extracted. Fill in manually."
    );
  };

  const handleScanImage = async (asset) => {
    setScanning(true);
    setScanNote("");
    try {
      const mimeType = asset.mimeType || "image/jpeg";
      const res = await scanReceipt(asset.uri, mimeType);
      reportOnline();
      applyScannedData(res.data);
    } catch (e) {
      if (!e.response) {
        reportOffline();
        Alert.alert("Offline", "Receipt scanning requires an internet connection.");
      } else {
        Alert.alert("Scan Failed", "Could not read the receipt. Fill in manually.");
      }
    } finally {
      setScanning(false);
    }
  };

  const pickFromCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) handleScanImage(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) handleScanImage(result.assets[0]);
  };

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
      if (isEdit) {
        await updateTransaction(existing.id, txData);
      } else {
        await createTransaction(txData);
      }
      reportOnline();
      Alert.alert("Saved!", isEdit ? "Transaction updated." : "Transaction recorded.", [
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
        <Text style={styles.title}>{isEdit ? "Edit Transaction" : "Add Transaction"}</Text>

        {/* Receipt auto-fill card — only shown when creating */}
        {!isEdit && (
          <View style={styles.scanCard}>
            <Text style={styles.scanCardTitle}>Auto-fill from Receipt</Text>
            <Text style={styles.scanCardSub}>Take a photo or upload an image of any receipt</Text>
            {scanning ? (
              <View style={styles.scanningRow}>
                <ActivityIndicator color="#2e7d32" />
                <Text style={styles.scanningText}>Scanning receipt…</Text>
              </View>
            ) : (
              <View style={styles.scanButtons}>
                <TouchableOpacity style={styles.scanBtn} onPress={pickFromCamera}>
                  <Text style={styles.scanBtnText}>📷  Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanBtn} onPress={pickFromGallery}>
                  <Text style={styles.scanBtnText}>🖼️  Upload</Text>
                </TouchableOpacity>
              </View>
            )}
            {scanNote !== "" && (
              <Text style={[styles.scanNote, scanNote.startsWith("Auto-filled") && styles.scanNoteSuccess]}>
                {scanNote}
              </Text>
            )}
          </View>
        )}

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
          placeholder="Notes…"
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
  title: { fontSize: 24, fontWeight: "700", color: "#222", marginBottom: 16 },

  scanCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  scanCardTitle: { fontSize: 15, fontWeight: "700", color: "#222", marginBottom: 2 },
  scanCardSub: { fontSize: 12, color: "#888", marginBottom: 12 },
  scanButtons: { flexDirection: "row", gap: 10 },
  scanBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f7f0",
    borderWidth: 1,
    borderColor: "#2e7d32",
  },
  scanBtnText: { color: "#2e7d32", fontWeight: "600", fontSize: 14 },
  scanningRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  scanningText: { color: "#555", fontSize: 14 },
  scanNote: { marginTop: 10, fontSize: 12, color: "#c62828" },
  scanNoteSuccess: { color: "#2e7d32" },

  typeRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
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
