import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { scanReceipt, createTransaction } from "../api/transactions";
import DateInput from "../components/DateInput";

const CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Entertainment", "Bills", "Salary", "Freelance", "Other"];

export default function ScanReceiptScreen({ navigation, route }) {
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [category, setCategory] = useState("Other");

  // If launched from home one-tap button, immediately process the captured image
  useEffect(() => {
    const asset = route?.params?.prefetchedAsset;
    if (asset) processAsset(asset);
  }, []);

  const processAsset = async (asset) => {
    setScanning(true);
    setResult(null);
    try {
      const { data } = await scanReceipt(asset.uri, asset.mimeType || "image/jpeg");
      setResult(data);
      setAmount(data.amount != null ? String(data.amount) : "");
      setMerchant(data.merchant || "");
      setDateStr(data.date || "");
      setCategory(data.suggested_category || "Other");
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not scan receipt. Please try again.";
      Alert.alert("Scan Failed", msg);
    } finally {
      setScanning(false);
    }
  };

  const pickImage = async (useCamera) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to continue.");
      return;
    }

    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (picked.canceled) return;
    processAsset(picked.assets[0]);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await createTransaction({
        type: "expense",
        amount: parsedAmount,
        merchant: merchant || null,
        date: dateStr || null,
        category,
      });
      Alert.alert("Saved!", "Transaction recorded.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Error", "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = (c) => (c >= 0.75 ? "#2e7d32" : c >= 0.4 ? "#f57c00" : "#c62828");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan Receipt</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.scanButton} onPress={() => pickImage(true)} disabled={scanning}>
          <Text style={styles.scanButtonText}>📷  Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scanButton} onPress={() => pickImage(false)} disabled={scanning}>
          <Text style={styles.scanButtonText}>🖼  Gallery</Text>
        </TouchableOpacity>
      </View>

      {scanning && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2e7d32" />
          <Text style={styles.loadingText}>Extracting receipt data…</Text>
        </View>
      )}

      {result && !scanning && (
        <View style={styles.resultBox}>
          {/* Confidence badge */}
          <View style={styles.confidenceRow}>
            <Text style={styles.sectionTitle}>Review & Edit</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor(result.confidence) }]}>
              <Text style={styles.confidenceText}>
                {Math.round(result.confidence * 100)}% confidence
              </Text>
            </View>
          </View>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <View style={styles.warningBox}>
              {result.warnings.map((w, i) => (
                <Text key={i} style={styles.warningText}>⚠ {w}</Text>
              ))}
            </View>
          )}

          <Text style={styles.label}>Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Merchant</Text>
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Store name"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Date</Text>
          <DateInput value={dateStr} onChangeText={setDateStr} style={styles.input} />

          {/* Detected items */}
          {result.items?.length > 0 && (
            <View style={styles.itemsBox}>
              <Text style={styles.itemsTitle}>Detected Items</Text>
              {result.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

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

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Expense</Text>}
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f9f9f9", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#2e7d32", marginBottom: 24 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  scanButton: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  scanButtonText: { color: "#2e7d32", fontWeight: "600", fontSize: 15 },
  loadingBox: { alignItems: "center", gap: 10, marginTop: 20 },
  loadingText: { color: "#888", fontSize: 14 },
  resultBox: { backgroundColor: "#fff", borderRadius: 12, padding: 20, marginTop: 8 },
  confidenceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#222" },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  confidenceText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  warningBox: { backgroundColor: "#fff8e1", borderRadius: 8, padding: 12, marginBottom: 12, gap: 4 },
  warningText: { fontSize: 13, color: "#e65100" },
  label: { fontSize: 13, color: "#666", marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#222" },
  itemsBox: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 12, marginTop: 16 },
  itemsTitle: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemName: { fontSize: 13, color: "#333", flex: 1 },
  itemPrice: { fontSize: 13, color: "#333", fontWeight: "600" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ccc", backgroundColor: "#fff" },
  chipSelected: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  chipText: { fontSize: 13, color: "#555" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  saveButton: { backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
