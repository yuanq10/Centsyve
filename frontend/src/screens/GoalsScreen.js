import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { listGoals, createGoal, deleteGoal, getGoalAnalysis, getGoalAIAdvice } from "../api/goals";
import { listTransactions } from "../api/transactions";
import DateInput from "../components/DateInput";

const PRIORITIES_KEY = "expense_priorities";

export default function GoalsScreen() {
  const [activeTab, setActiveTab] = useState("goals");

  // ── Goals tab ──
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [analyses, setAnalyses] = useState({});
  const [loadingAnalysis, setLoadingAnalysis] = useState({});
  const [aiAdvice, setAiAdvice] = useState({});
  const [loadingAI, setLoadingAI] = useState({});

  // ── Priorities tab ──
  const [categories, setCategories] = useState([]);   // [{name, monthly}]
  const [priorities, setPriorities] = useState({});   // {category: 0-5}
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [savingPriorities, setSavingPriorities] = useState(false);

  // ── Load goals ──
  const loadGoals = useCallback(async () => {
    setLoadingGoals(true);
    try {
      const { data } = await listGoals();
      setGoals(data);
    } catch {
      Alert.alert("Error", "Could not load goals.");
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  // ── Load priorities tab data ──
  const loadPriorities = useCallback(async () => {
    setLoadingPriorities(true);
    try {
      const txRes = await listTransactions();
      const txs = txRes.data;

      // Determine lookback period from nearest goal, default 90 days
      const today = new Date();
      let lookbackDays = 90;
      if (goals.length > 0) {
        const nearest = goals.reduce((a, b) =>
          new Date(a.target_date) < new Date(b.target_date) ? a : b
        );
        const daysToGoal = Math.max(
          Math.round((new Date(nearest.target_date) - today) / 86400000), 30
        );
        lookbackDays = daysToGoal;
      }

      const cutoff = new Date(today - lookbackDays * 86400000);
      const periodTxs = txs.filter(
        (t) => t.type === "expense" && t.date && new Date(t.date) >= cutoff
      );

      const months = Math.max(lookbackDays / 30, 0.5);
      const catMap = {};
      periodTxs.forEach((t) => {
        const cat = t.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + t.amount;
      });

      const catList = Object.entries(catMap)
        .map(([name, total]) => ({ name, monthly: Math.round(total / months) }))
        .sort((a, b) => b.monthly - a.monthly);

      setCategories(catList);

      const stored = await AsyncStorage.getItem(PRIORITIES_KEY);
      if (stored) setPriorities(JSON.parse(stored));
    } catch {
      // silent
    } finally {
      setLoadingPriorities(false);
    }
  }, [goals]);

  // ── Expand a goal and load its analysis ──
  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (analyses[id]) return;
    setLoadingAnalysis((p) => ({ ...p, [id]: true }));
    try {
      const { data } = await getGoalAnalysis(id);
      setAnalyses((p) => ({ ...p, [id]: data }));
    } catch {
      Alert.alert("Error", "Could not load analysis.");
    } finally {
      setLoadingAnalysis((p) => ({ ...p, [id]: false }));
    }
  };

  // ── Ask AI about a goal ──
  const askAI = async (id) => {
    setLoadingAI((p) => ({ ...p, [id]: true }));
    try {
      const { data } = await getGoalAIAdvice(id);
      setAiAdvice((p) => ({ ...p, [id]: data.advice }));
    } catch (e) {
      Alert.alert("Error", e.response?.data?.detail || "Could not get AI advice.");
    } finally {
      setLoadingAI((p) => ({ ...p, [id]: false }));
    }
  };

  // ── Create goal ──
  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Please enter a goal name."); return; }
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Error", "Please enter a valid target amount."); return; }
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert("Error", "Please enter a date in YYYY-MM-DD format."); return; }
    if (new Date(newDate) <= new Date()) { Alert.alert("Error", "Target date must be in the future."); return; }

    setCreating(true);
    try {
      await createGoal({ name: newName.trim(), target_amount: amount, target_date: newDate, notes: newNotes || null });
      setNewName(""); setNewAmount(""); setNewDate(""); setNewNotes("");
      setShowForm(false);
      loadGoals();
    } catch {
      Alert.alert("Error", "Could not create goal.");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete goal ──
  const handleDelete = (id, name) => {
    Alert.alert("Delete Goal", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteGoal(id);
            setGoals((p) => p.filter((g) => g.id !== id));
            if (expandedId === id) setExpandedId(null);
          } catch {
            Alert.alert("Error", "Could not delete goal.");
          }
        },
      },
    ]);
  };

  // ── Save priorities ──
  const savePriorities = async () => {
    setSavingPriorities(true);
    try {
      await AsyncStorage.setItem(PRIORITIES_KEY, JSON.stringify(priorities));
      Alert.alert("Saved", "Your priority ratings have been saved.");
    } finally {
      setSavingPriorities(false);
    }
  };

  const potentialSavings = categories
    .filter((c) => (priorities[c.name] ?? 0) >= 4)
    .reduce((sum, c) => sum + c.monthly, 0);

  const reducibleSavings = categories
    .filter((c) => (priorities[c.name] ?? 0) === 3)
    .reduce((sum, c) => sum + Math.round(c.monthly * 0.5), 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {["goals", "priorities"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab);
              if (tab === "priorities") loadPriorities();
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "goals" ? "My Goals" : "Priorities"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── GOALS TAB ── */}
      {activeTab === "goals" && (
        <ScrollView contentContainerStyle={styles.content}>

          {/* Create form toggle */}
          {!showForm ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.addBtnText}>＋  New Goal</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Goal</Text>
              <Text style={styles.label}>Goal Name</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g. Emergency Fund" placeholderTextColor="#aaa" />
              <Text style={styles.label}>Target Amount ($)</Text>
              <TextInput style={styles.input} value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="5000.00" placeholderTextColor="#aaa" />
              <Text style={styles.label}>Target Date</Text>
              <DateInput value={newDate} onChangeText={setNewDate} />
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput style={styles.input} value={newNotes} onChangeText={setNewNotes} placeholder="Why this goal matters…" placeholderTextColor="#aaa" />
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={creating}>
                  {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Goal</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Goals list */}
          {loadingGoals ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#2e7d32" />
          ) : goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptySubtitle}>Create a goal to see if your current spending puts you on track to reach it.</Text>
            </View>
          ) : (
            goals.map((goal) => {
              const analysis = analyses[goal.id];
              const expanded = expandedId === goal.id;
              const onTrack = analysis?.on_track;
              return (
                <View key={goal.id} style={styles.goalCard}>
                  {/* Card header */}
                  <TouchableOpacity onPress={() => toggleExpand(goal.id)}>
                    <View style={styles.goalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Text style={styles.goalMeta}>
                          ${goal.target_amount.toLocaleString()}  •  by {goal.target_date}
                        </Text>
                      </View>
                      {analysis && (
                        <View style={[styles.badge, onTrack ? styles.badgeGreen : styles.badgeRed]}>
                          <Text style={styles.badgeText}>{onTrack ? "On track ✓" : "Needs attention ⚠"}</Text>
                        </View>
                      )}
                      <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded analysis */}
                  {expanded && (
                    <View style={styles.analysisBox}>
                      {loadingAnalysis[goal.id] ? (
                        <ActivityIndicator color="#2e7d32" />
                      ) : analysis ? (
                        <>
                          <View style={styles.statRow}>
                            <View style={styles.stat}>
                              <Text style={styles.statLabel}>Required/month</Text>
                              <Text style={styles.statValue}>${analysis.required_monthly_savings}</Text>
                            </View>
                            <View style={styles.stat}>
                              <Text style={styles.statLabel}>Saving now</Text>
                              <Text style={[styles.statValue, { color: analysis.monthly_savings >= 0 ? "#2e7d32" : "#c62828" }]}>
                                ${analysis.monthly_savings}
                              </Text>
                            </View>
                            <View style={styles.stat}>
                              <Text style={styles.statLabel}>Monthly gap</Text>
                              <Text style={[styles.statValue, { color: analysis.monthly_gap > 0 ? "#c62828" : "#2e7d32" }]}>
                                {analysis.monthly_gap > 0 ? `-$${analysis.monthly_gap}` : "None"}
                              </Text>
                            </View>
                          </View>

                          {/* Built-in suggestions */}
                          {analysis.suggestions.length > 0 && (
                            <View style={styles.suggestionsBox}>
                              <Text style={styles.suggestionsTitle}>💡 Suggestions to close the gap</Text>
                              {analysis.suggestions.map((s, i) => (
                                <View key={i} style={styles.suggestionRow}>
                                  <Text style={styles.suggestionCat}>{s.category}  <Text style={styles.suggestionAmt}>${s.monthly_spend}/mo</Text></Text>
                                  <Text style={styles.suggestionTip}>{s.tip}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* AI advice */}
                          {aiAdvice[goal.id] ? (
                            <View style={styles.aiBox}>
                              <Text style={styles.aiBoxTitle}>🤖 AI Advice</Text>
                              <Text style={styles.aiBoxText}>{aiAdvice[goal.id]}</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.aiBtn}
                              onPress={() => askAI(goal.id)}
                              disabled={loadingAI[goal.id]}
                            >
                              {loadingAI[goal.id]
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.aiBtnText}>🤖  Ask AI for Personalised Advice</Text>}
                            </TouchableOpacity>
                          )}
                        </>
                      ) : null}

                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(goal.id, goal.name)}>
                        <Text style={styles.deleteBtnText}>Delete Goal</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── PRIORITIES TAB ── */}
      {activeTab === "priorities" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.prioritiesIntro}>
            Rate each spending category below. Use this to identify what you can cut to reach your goals faster.
          </Text>
          <View style={styles.ratingLegend}>
            <Text style={styles.legendText}>0 = Essential  →  5 = Can cut entirely</Text>
          </View>

          {loadingPriorities ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#2e7d32" />
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No expense data yet</Text>
              <Text style={styles.emptySubtitle}>Add some transactions first, then come back to rate your spending priorities.</Text>
            </View>
          ) : (
            <>
              {categories.map((cat) => {
                const rating = priorities[cat.name] ?? null;
                return (
                  <View key={cat.name} style={styles.priorityRow}>
                    <View style={styles.priorityCatInfo}>
                      <Text style={styles.priorityCatName}>{cat.name}</Text>
                      <Text style={styles.priorityCatAmt}>${cat.monthly}/mo</Text>
                    </View>
                    <View style={styles.ratingButtons}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.ratingBtn, rating === n && styles.ratingBtnActive(n)]}
                          onPress={() => setPriorities((p) => ({ ...p, [cat.name]: n }))}
                        >
                          <Text style={[styles.ratingBtnText, rating === n && styles.ratingBtnTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Savings summary */}
              {(potentialSavings > 0 || reducibleSavings > 0) && (
                <View style={styles.savingsSummary}>
                  <Text style={styles.savingsSummaryTitle}>Potential Monthly Savings</Text>
                  {potentialSavings > 0 && (
                    <Text style={styles.savingsSummaryLine}>
                      Categories rated 4–5 (can cut):  <Text style={styles.savingsGreen}>${potentialSavings}/mo</Text>
                    </Text>
                  )}
                  {reducibleSavings > 0 && (
                    <Text style={styles.savingsSummaryLine}>
                      Categories rated 3 (reduce by 50%):  <Text style={styles.savingsYellow}>${reducibleSavings}/mo</Text>
                    </Text>
                  )}
                  <Text style={[styles.savingsSummaryLine, { marginTop: 6, fontWeight: "700" }]}>
                    Total potential:  <Text style={styles.savingsGreen}>${potentialSavings + reducibleSavings}/mo</Text>
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={savePriorities} disabled={savingPriorities}>
                {savingPriorities ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Priorities</Text>}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const ratingColor = (n) => {
  if (n <= 1) return "#c62828";
  if (n <= 2) return "#e65100";
  if (n === 3) return "#f9a825";
  return "#2e7d32";
};

const styles = StyleSheet.create({
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2e7d32" },
  tabText: { fontSize: 15, color: "#888", fontWeight: "500" },
  tabTextActive: { color: "#2e7d32", fontWeight: "700" },
  content: { padding: 16, flexGrow: 1, backgroundColor: "#f5f5f5" },

  addBtn: { backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  formCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 12 },
  label: { fontSize: 13, color: "#666", marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#222" },
  formButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  cancelBtnText: { color: "#555", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#2e7d32", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#222" },
  emptySubtitle: { fontSize: 14, color: "#888", textAlign: "center", paddingHorizontal: 24 },

  goalCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  goalHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  goalName: { fontSize: 16, fontWeight: "700", color: "#222" },
  goalMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGreen: { backgroundColor: "#e8f5e9" },
  badgeRed: { backgroundColor: "#ffebee" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  chevron: { color: "#aaa", fontSize: 12, marginLeft: 4 },

  analysisBox: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "#f9f9f9", borderRadius: 8, padding: 10, alignItems: "center" },
  statLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "700", color: "#222" },

  suggestionsBox: { backgroundColor: "#fffde7", borderRadius: 8, padding: 12, marginTop: 12 },
  suggestionsTitle: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8 },
  suggestionRow: { marginBottom: 8 },
  suggestionCat: { fontSize: 13, fontWeight: "600", color: "#222" },
  suggestionAmt: { color: "#c62828", fontWeight: "400" },
  suggestionTip: { fontSize: 12, color: "#555", marginTop: 2 },

  aiBox: { backgroundColor: "#e8eaf6", borderRadius: 8, padding: 12, marginTop: 12 },
  aiBoxTitle: { fontSize: 13, fontWeight: "700", color: "#1a237e", marginBottom: 6 },
  aiBoxText: { fontSize: 13, color: "#333", lineHeight: 20 },
  aiBtn: { backgroundColor: "#1a237e", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  aiBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  deleteBtn: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  deleteBtnText: { color: "#c62828", fontSize: 13, fontWeight: "600" },

  // Priorities tab
  prioritiesIntro: { fontSize: 14, color: "#555", marginBottom: 10 },
  ratingLegend: { backgroundColor: "#fff", borderRadius: 8, padding: 10, marginBottom: 12 },
  legendText: { fontSize: 12, color: "#888", textAlign: "center" },

  priorityRow: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  priorityCatInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  priorityCatName: { fontSize: 15, fontWeight: "600", color: "#222" },
  priorityCatAmt: { fontSize: 13, color: "#888" },
  ratingButtons: { flexDirection: "row", gap: 6 },
  ratingBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: "center", backgroundColor: "#f0f0f0" },
  ratingBtnActive: (n) => ({ backgroundColor: ratingColor(n) }),
  ratingBtnText: { fontSize: 13, fontWeight: "600", color: "#555" },
  ratingBtnTextActive: { color: "#fff" },

  savingsSummary: { backgroundColor: "#e8f5e9", borderRadius: 10, padding: 14, marginVertical: 12 },
  savingsSummaryTitle: { fontSize: 14, fontWeight: "700", color: "#2e7d32", marginBottom: 6 },
  savingsSummaryLine: { fontSize: 13, color: "#333", marginBottom: 2 },
  savingsGreen: { color: "#2e7d32", fontWeight: "700" },
  savingsYellow: { color: "#f9a825", fontWeight: "700" },
});
