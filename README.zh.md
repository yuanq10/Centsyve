# Centsyve

一款完全离线的个人记账手机应用，基于 React Native 和 Expo 构建。旨在将 Excel 记账表格的简洁性带入移动端——记录日常支出、管理固定账单、查看月度汇总，并分析消费趋势。

## 功能

- **账单** — 按商家、分类和金额记录日常支出，可按年份和月份筛选（或查看全年所有账单）。
- **汇总** — 月度分类汇总表，展示全年各月各分类支出及年度合计。
- **趋势** — 支出折线图，支持 1周 / 本月 / 1年 / 今年 时间范围及按分类筛选，并与上期对比。
- **固定支出** — 设置每月固定账单（房租、手机费等），到期自动记账。
- **中英双语** — 支持完整的中英文界面，可在设置中切换。
- **数据导出** — 支持 CSV 导入导出及 JSON 完整备份与恢复。
- **完全离线** — 无需账号、无需服务器、无需网络，所有数据本地存储。

## 下载

[下载 APK](https://expo.dev/artifacts/eas/DFY5akWhIK_ItJy88zPZzK5b7VQFbtTaVh9u9ru70LI.apk)

## 技术栈

- React Native (Expo SDK 54, 托管工作流)
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

## 安装

目前仅支持 **Android**（iOS 不支持直接安装 `.apk` 文件）。

1. 点击上方链接下载 APK 文件
2. 将 APK 传输至 Android 手机（或直接在手机上打开链接下载）
3. 进入手机 设置 → 安全 → 开启**允许安装未知来源应用**
4. 打开 APK 文件并点击安装
