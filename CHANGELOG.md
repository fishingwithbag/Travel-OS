# Changelog

本專案遵循語意化版本概念；beta 期間可能調整資料結構，變更會記錄於此。

## Unreleased

### Changed

- Firebase 設定精靈不再假設 `firebaseConfig` 一定包含 `databaseURL`。使用者可從 Realtime Database「資料」頁籤另外複製資料庫網址，Travel OS 會自動合併並驗證；Firebase 操作路徑同步改為繁體中文介面名稱。
- 瀏覽器本機資料改依部署路徑隔離。同一個 `username.github.io` 底下的不同 Travel OS repository，不再共用 IndexedDB 旅程、Firebase/Maps 設定、onboarding 狀態或主題。舊版未分路徑的共用資料不自動搬移，避免再次跨 repository 混用。
- 設定精靈重做為六段式流程：網站 → Firebase → Google Maps → 登入 → 驗證 → 完成；每一步都提供零基礎操作路徑與完成條件。
- Firebase 精靈明確要求 Spark、Email/Password、Realtime Database Locked mode 與 Travel OS Rules，並提供 Rules 一鍵複製與 `firebaseConfig` 解析預覽。
- Google Maps 設定改為獨立 Billing project，避免為 Maps 啟用 Billing 時把 Firebase Spark project 升級為 Blaze。
- Self-host 第一次使用改以 Firebase 雲端同步為 onboarding 主流程，本機 IndexedDB 保留為 Demo／離線／fallback。
- Google Maps Browser Key 回到設定精靈，實際驗證 Maps JavaScript 與 Places；UI 遮罩 Key，並引導設定 Website/API restrictions、quota 與 billing alerts。
- Browser Key 可隨 Firebase 公開 config 選擇性記住在目前裝置；密碼與 Server Key 永不保存。Routes／Geocoding／Weather Server Key 仍只允許存在使用者自己的後端。
- Firebase Rules deploy 新增本機明確 target 與 predeploy boundary guard；OpenSource 不再允許從登入帳號或其他 repository 的 Firebase project 推測 production 部署目標。

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
