import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getInsights, sendChatMessage } from "../api/ai";

const SUGGESTED_QUESTIONS = [
  "How can I save more money?",
  "Where am I spending the most?",
  "Am I on track with my budget?",
  "Give me a savings plan.",
];

export default function AIAdvisorScreen() {
  const [activeTab, setActiveTab] = useState("insights");

  // Insights tab state
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Chat tab state
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your Centsyve AI advisor. Ask me anything about your finances." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data } = await getInsights();
      setInsights(data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not load insights. Check your Anthropic API key.";
      Alert.alert("Error", msg);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSend = async (text) => {
    const message = (text || input).trim();
    if (!message) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setSending(true);
    try {
      const { data } = await sendChatMessage(message);
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not get a response. Please try again.";
      setMessages((prev) => [...prev, { role: "ai", text: `⚠ ${msg}` }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "insights" && styles.tabActive]}
          onPress={() => setActiveTab("insights")}
        >
          <Text style={[styles.tabText, activeTab === "insights" && styles.tabTextActive]}>
            Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "chat" && styles.tabActive]}
          onPress={() => setActiveTab("chat")}
        >
          <Text style={[styles.tabText, activeTab === "chat" && styles.tabTextActive]}>
            AI Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Insights Tab ── */}
      {activeTab === "insights" && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {!insights && !loadingInsights && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyTitle}>AI-Powered Insights</Text>
              <Text style={styles.emptySubtitle}>
                Get a personalised spending analysis and budget recommendations based on your transaction history.
              </Text>
              <TouchableOpacity style={styles.generateButton} onPress={loadInsights}>
                <Text style={styles.generateButtonText}>Generate Insights</Text>
              </TouchableOpacity>
            </View>
          )}

          {loadingInsights && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={styles.loadingText}>Analysing your finances…</Text>
            </View>
          )}

          {insights && !loadingInsights && (
            <>
              <View style={styles.insightCard}>
                <Text style={styles.insightCardTitle}>📊 Spending Analysis</Text>
                <Text style={styles.insightCardBody}>{insights.spending_insights}</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightCardTitle}>💡 Budget Recommendations</Text>
                <Text style={styles.insightCardBody}>{insights.budget_recommendations}</Text>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={loadInsights}>
                <Text style={styles.refreshButtonText}>↻  Refresh</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg, i) => (
              <View
                key={i}
                style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.aiBubble]}
              >
                <Text style={[styles.bubbleText, msg.role === "user" && styles.userBubbleText]}>
                  {msg.text}
                </Text>
              </View>
            ))}
            {sending && (
              <View style={styles.aiBubble}>
                <ActivityIndicator size="small" color="#2e7d32" />
              </View>
            )}

            {/* Suggested questions */}
            {messages.length === 1 && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionsLabel}>Try asking:</Text>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <TouchableOpacity key={q} style={styles.suggestionChip} onPress={() => handleSend(q)}>
                    <Text style={styles.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ height: 12 }} />
          </ScrollView>

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.chatInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your finances…"
              placeholderTextColor="#aaa"
              multiline
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!input.trim() || sending}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2e7d32" },
  tabText: { fontSize: 15, color: "#888", fontWeight: "500" },
  tabTextActive: { color: "#2e7d32", fontWeight: "700" },

  // Insights
  tabContent: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#222" },
  emptySubtitle: { fontSize: 14, color: "#888", textAlign: "center", paddingHorizontal: 24 },
  generateButton: { backgroundColor: "#2e7d32", borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  generateButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  insightCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  insightCardTitle: { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 10 },
  insightCardBody: { fontSize: 14, color: "#444", lineHeight: 22 },
  refreshButton: { alignItems: "center", paddingVertical: 12 },
  refreshButtonText: { color: "#2e7d32", fontWeight: "600", fontSize: 14 },

  // Chat
  chatContent: { padding: 16, flexGrow: 1 },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12, marginBottom: 8 },
  aiBubble: { backgroundColor: "#fff", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: "#2e7d32", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: "#222", lineHeight: 20 },
  userBubbleText: { color: "#fff" },
  suggestionsBox: { marginTop: 16, gap: 8 },
  suggestionsLabel: { fontSize: 13, color: "#aaa", marginBottom: 4 },
  suggestionChip: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start" },
  suggestionText: { fontSize: 13, color: "#2e7d32" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee", gap: 8 },
  chatInput: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: "#222", maxHeight: 100 },
  sendButton: { backgroundColor: "#2e7d32", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: "#ccc" },
  sendButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
