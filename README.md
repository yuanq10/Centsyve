# Centsyve

**English** | [中文](README.zh.md)

A fully offline personal expense tracking mobile app built with React Native and Expo. Designed to replicate the simplicity of an Excel expense spreadsheet with a clean mobile experience — log transactions, track recurring bills, view monthly summaries, and analyze spending trends.

## Features

- **Transactions** — Log daily expenses by merchant, category, and amount. Filter by year and month (or view the full year at once).
- **Summary** — Monthly pivot table showing spending by category across all months of the year, with annual totals.
- **Trends** — Line graph of spending over time (1W / 1M / 1Y / YTD) with per-category filtering and period-over-period comparison.
- **Recurring Bills** — Define monthly recurring expenses (rent, phone, etc.) that auto-post on their due date every month.
- **Bilingual** — Full English and Mandarin Chinese support, switchable in Settings.
- **Data portability** — Export to CSV, import from CSV or Excel (.xlsx).
- **Local-first** — All data lives on your device by default; no account or internet needed unless you turn on Google Sheets sync.
- **Google Sheets sync** — Optionally connect a Google Sheet and sync transactions both ways, with conflict detection if the same transaction changed on both sides.
  - This app is mainly for personal use, so Google Sheets sync is only available to authorized users. If you'd like to try this feature, contact the developer at loganyuan6@gmail.com.

## Download

[Download APK](https://expo.dev/artifacts/eas/HLwC0N4y3oTfTaxRZgRvz8fA7Jyh1IZcq5uol4LoEYc.apk)

## Tech Stack

- React Native (Expo SDK 54, managed workflow)
- TypeScript
- expo-sqlite v16
- Zustand v5

## Installation

Currently supported on **Android only** (iOS does not support sideloaded `.apk` files).

1. Download the APK from the link above
2. Transfer it to your Android phone (or open it directly if downloading on the phone)
3. On your phone go to Settings → Security → enable **Install from unknown sources**
4. Open the APK file and tap Install
