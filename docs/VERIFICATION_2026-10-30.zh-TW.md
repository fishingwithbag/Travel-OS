# Firebase Spark 真實瀏覽器驗證

日期：2026-10-30（Asia/Taipei）

候選版本：`feature/release-readiness`，commit `f1e047b`

本報告只記錄獨立測試專案與合成旅程的實際結果；不記錄帳號、UID、Firebase Project ID、Web config、密碼或 API Key。

## 已通過

- 設定精靈 Step 5 成功使用 Email／Password 登入 Firebase Authentication，並完成本人 UID 診斷路徑的寫入、讀取與刪除。
- 登入後載入既有雲端旅程與 owner 權限；Realtime Database 連線狀態正常。
- owner 先下載私人備份及預覽，再將一趟舊格式旅程由 revision 4 升級至 revision 5；內容、群組及成員權限保留，升級後可編輯。
- 在雲端新增並收藏一筆合成景點，再加入每日行程。備註、目的地 Maps URL、手動交通時間、行程費用、主要／備用停車場、步行分鐘、各自費用及備註均成功寫入並在「下一站」與完整時間軸顯示。
- 重新開啟並登入新分頁後，前述景點、行程、備註、地圖與停車資料完整讀回。
- 私人完整備份與分享副本的兩個匯出入口均可操作；本輪未以匯入建立額外雲端旅程，因此「真實雲端還原為新旅程」仍保留待驗。
- 驗收建立的暫存每日安排及景點已透過介面刪除；刪除後景點庫回到 0 筆，未殘留該筆暫存資料。
- 新增的「登出並清除 Firebase 設定」成功停止雲端工作階段、切回 IndexedDB、移除已記住的 Web config、清空精靈欄位並回到 Step 1；雲端旅程沒有被刪除。
- PR CI run `40908692830` 全數成功：163 項單元測試、production build、`npm audit --audit-level=high` 與正式 Firebase Rules Emulator 測試均通過。
- 將 production `dist` 放在實際 `/Travel-OS/` 子目錄，以純靜態伺服器載入；首頁、雜湊 CSS／JavaScript、`sw.js` 及 `manifest.webmanifest` 均由子路徑成功回應。Service Worker cache 版本升至 v3，啟用時會移除舊版 shell cache。

## 驗收邊界

- 本輪只使用一個 owner 帳號；真實 editor／viewer、撤權及跨裝置即時更新仍待第二、第三測試帳號操作。
- 已驗證重新登入讀回與清除設定，尚未用第二個 Firebase Project ID 實測專案切換及跨專案快取隔離。
- 匯出入口已驗；真實雲端匯入還原、錯誤備份檔與大資料量仍待完成。
- 本輪已用純靜態伺服器驗證 Pages 型態的 `/Travel-OS/` 子路徑產物，但不是 GitHub 正式環境。正式 Pages 部署、Service Worker 線上更新與受限 Google Key 仍須在合併候選版本後重測。
- 因此本輪關閉單帳號 Spark CRUD／重登讀回／清除設定的主要缺口，但尚不能宣告整體公開發布門檻通過。
