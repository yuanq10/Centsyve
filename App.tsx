import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import { initDatabase, getDb } from './src/db/database';
import { runCatchUpPosting } from './src/db/recurring';
import { useTransactionStore } from './src/store/useTransactionStore';
import { useRecurringStore } from './src/store/useRecurringStore';
import { useLocaleStore } from './src/store/useLocaleStore';
import { t } from './src/i18n';

import TransactionsScreen from './src/screens/TransactionsScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import TrendsScreen from './src/screens/TrendsScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const loadTransactions = useTransactionStore((s) => s.load);
  const loadRecurring = useRecurringStore((s) => s.load);
  const { locale, setLocale } = useLocaleStore();

  useEffect(() => {
    async function boot() {
      await initDatabase();
      runCatchUpPosting();
      loadTransactions();
      loadRecurring();

      // Restore persisted locale preference
      try {
        const row = getDb().getFirstSync<{ value: string }>(
          'SELECT value FROM app_meta WHERE key = ?',
          ['locale']
        );
        if (row?.value) setLocale(row.value);
      } catch {}

      setReady(true);
    }
    boot();
  }, []);

  // Re-run catch-up when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        runCatchUpPosting();
        loadTransactions();
        loadRecurring();
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {/* key={locale} forces the entire navigator to remount when language changes,
          ensuring all tab titles and screen content re-render with the new locale */}
      <Tab.Navigator key={locale} screenOptions={{ headerShown: true }}>
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{ title: t('tabs.transactions') }}
        />
        <Tab.Screen
          name="Summary"
          component={SummaryScreen}
          options={{ title: t('tabs.summary') }}
        />
        <Tab.Screen
          name="Trends"
          component={TrendsScreen}
          options={{ title: t('tabs.trends') }}
        />
        <Tab.Screen
          name="Recurring"
          component={RecurringScreen}
          options={{ title: t('tabs.recurring') }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('tabs.settings') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
