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

[Download APK](https://expo.dev/artifacts/eas/DFY5akWhIK_ItJy88zPZzK5b7VQFbtTaVh9u9ru70LI.apk) 

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

## Installation

Currently supported on **Android only** (iOS does not support sideloaded `.apk` files).

1. Download the APK from the link above
2. Transfer it to your Android phone (or open it directly if downloading on the phone)
3. On your phone go to Settings → Security → enable **Install from unknown sources**
4. Open the APK file and tap Install
