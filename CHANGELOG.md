# Changelog

本專案遵循語意化版本概念；beta 期間可能調整資料結構，變更會記錄於此。

## Unreleased

### Changed

- 移除尚未被任何 Maps／Places 功能使用的 Google Maps Browser Key 設定與動態 script loader；現有 Google Maps 外部導航維持無 key 使用。
- 舊版曾記住的 Browser Key 不再載入，若同時有有效 Firebase Web config 會自動只保留 Firebase 設定。
- 文件明確區分未來 Maps JavaScript／Places 的 Browser Key 與 Routes／Geocoding／Weather 的後端 Server Key 安全邊界。

## 0.1.0-beta.2 - 2026-09-21

### Security

- 官方公開體驗站改為僅限本機模式，停用 Firebase、Google key 與帳密輸入。
- 進入公開體驗站時清除舊版可能記住的雲端連線設定。
- 雲端模式改由使用者自行部署的網站副本啟用，並補充前端託管信任邊界。

## 0.1.0-beta.1 - 2026-09-20

### Added

- IndexedDB local-first 多旅程規劃器。
- 動態日期、同行群組、跨時區手動航班與多幣別摘要。
- 網站內 Firebase Web config 設定、Email/Password 登入與診斷讀寫。
- Realtime Database owner／editor／viewer Rules 與 Emulator 測試。
- 選配 Google Maps browser key，以及無 key 的地圖連結降級。
- 私人備份、分享副本、匯入預覽、離線 app shell 與 GitHub Pages 相對路徑建置。
