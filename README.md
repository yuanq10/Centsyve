# Centsyve

A fully offline personal expense tracking mobile app built with React Native and Expo. Designed to replicate the simplicity of an Excel expense spreadsheet with a clean mobile experience — log transactions, track recurring bills, view monthly summaries, and analyze spending trends.

## Features

- **Transactions** — Log daily expenses by merchant, category, and amount. Filter by year and month (or view the full year at once).
- **Summary** — Monthly pivot table showing spending by category across all months of the year, with annual totals.
- **Trends** — Line graph of spending over time (1W / 1M / 1Y / YTD) with per-category filtering and period-over-period comparison.
- **Recurring Bills** — Define monthly recurring expenses (rent, phone, etc.) that auto-post on their due date every month.
- **Bilingual** — Full English and Mandarin Chinese support, switchable in Settings.
- **Data portability** — Export/import via CSV, full JSON backup and restore.
- **Fully offline** — No account, no server, no internet required. All data stored locally on device.

## Download

[Download APK](#) ← replace with actual link once built

## Tech Stack

- React Native (Expo SDK 54, managed workflow)
- TypeScript
- expo-sqlite v16
- Zustand v5
- react-native-gifted-charts
- @react-navigation/native + @react-navigation/bottom-tabs
- @react-native-community/datetimepicker
- i18n-js + expo-localization
- expo-file-system
- expo-sharing
- expo-document-picker
- EAS Build

## Building

```bash
npm install
eas build -p android --profile preview
```
