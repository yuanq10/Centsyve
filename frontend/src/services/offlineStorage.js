import AsyncStorage from "@react-native-async-storage/async-storage";

const TX_CACHE_KEY = "cached_transactions";
const PENDING_KEY = "pending_transactions";

export async function cacheTransactions(transactions) {
  await AsyncStorage.setItem(TX_CACHE_KEY, JSON.stringify(transactions));
}

export async function getCachedTransactions() {
  const raw = await AsyncStorage.getItem(TX_CACHE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Adds a transaction to the pending sync queue AND the local cache so it
// shows up immediately in the UI while the device is offline.
export async function addToPendingQueue(transaction) {
  const item = { ...transaction, _offlineId: Date.now(), _pending: true };

  const rawQueue = await AsyncStorage.getItem(PENDING_KEY);
  const queue = rawQueue ? JSON.parse(rawQueue) : [];
  queue.push(item);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(queue));

  const rawCache = await AsyncStorage.getItem(TX_CACHE_KEY);
  const cache = rawCache ? JSON.parse(rawCache) : [];
  cache.unshift(item);
  await AsyncStorage.setItem(TX_CACHE_KEY, JSON.stringify(cache));

  return item;
}

export async function getPendingQueue() {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearPendingQueue() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

// Pure JS summary — no network needed.
export function computeSummary(transactions) {
  const total_income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const total_expenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  return { total_income, total_expenses, balance: total_income - total_expenses };
}
