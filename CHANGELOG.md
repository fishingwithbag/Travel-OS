# Changelog

本專案遵循語意化版本概念；beta 期間可能調整資料結構，變更會記錄於此。

## Unreleased

### Added

- 正式接入完整不可變旅程版本及原子清除上一版，阻止局部刪除群組造成孤立行程／停車參照。舊旅程由 owner 下載完整備份並預覽後確認遷移；失敗原子保留舊資料，支援還原為新旅程。設定精靈診斷檢查目前 Rules 格式。

- UID 成員管理、editor／viewer 角色、旅程即時訂閱、撤權清除與離線狀態；登入同一 Firebase 專案的個別帳號可共用旅程，真實 Spark 瀏覽器驗收仍待完成。
- 旅程專屬景點庫、地區／類別／子類別搜尋、收藏／取消收藏及加入每日行程。
- 任意群組的租車預訂與獨立取還車安排；住宿預訂、房型／人數、入住／退房安排。
- 獨立費用 CRUD、付款人、分類與人數分攤，餘額按整數最小單位列出，不混加幣別。
- 雲端備份可逐趟還原為新 ID，由目前帳號擁有；不覆蓋既有旅程或匯入來源 membership。真實 Spark 驗收仍待完成。
- 每日行程加入「下一個安排」摘要，直接顯示備註、主要／備用停車場及各自的 Google Maps 導航；完整時間軸也顯示這些資訊。
- 行程可選填目的地 Google Maps 連結與停車資訊。沒有連結時以地址或名稱搜尋；地圖外部導航不需 API Key。
- 選配 Google Places 站內搜尋與 Routes 交通時間／距離估算；共用受限瀏覽器 Key，失敗時保留手動資料與外部導航。

### Changed

- Firebase 設定新增明確的「登出並清除 Firebase 設定」；會先安全切回本機 IndexedDB、停止即時訂閱並登出 Auth，再移除這台裝置記住的 Web config 與精靈欄位，不刪除雲端旅程。單純切換到本機模式則保留設定，避免兩種操作混淆。
- 完整移植原站 `travel-os.css`，並依原版 DOM 重構旅程首頁、每日行程、景點收藏與行程管理；恢復手機底部導覽／桌面 92px 側欄、原版深淺色票、頂列、卡片、留白、響應式斷點與彩色 Google Maps、編輯、收藏、停車、設定及主題 SVG 圖示。通用版仍使用去個人化資料模型。
- 修正移植後的景點工具列與行程管理版面：景點搜尋、三組篩選、地區標籤、新增列、筆數及排序恢復原版層級；行程管理改回原版收合列，避免功能區塊預設全部展開造成過大間距。切換檢視不再把標題強制聚焦而顯示白色外框。
- 每日行程右側工具恢復原版順序、五個操作入口與三欄統計；行程數、行程時數及費用只計算目前日期與目前群組。恢復「清空這天」確認流程，並修正左側群組按鈕誤開管理視窗的問題：每日行程負責篩選，共享安排會保留；群組改名／刪除集中在行程管理。
- 修正「下一站」標題重複、切換檢視保留舊捲動位置、停車資訊在時間軸被拉成過大直欄，以及「加入航班」未預先選取航班類型。
- 移除安全測試留下的 HTML 標記文字。使用者備註仍一律以純文字逸出呈現，避免把資料當成 HTML 執行。
- Firebase config 欄位改為輸入時立即重驗。誤貼 Realtime Database Rules 時會撤銷舊成功預覽、阻止進入下一步，並指向 Firebase Web config 的正確複製位置。
- 成員管理只允許原 ownerId；禁止第二個 owner、原擁有者降權或移除。遠端更新保留草稿，切換專案停止訂閱並隔離晚到寫入結果。
- 完整備份保留景點／收藏、租車、住宿與獨立費用；分享副本移除這些私人資料。
- 修正本機還原在寫入完成後讀取失效事件參照，導致錯報失敗且視窗未關閉的問題。
- Google Places／自動交通功能已恢復，設定精靈說明 Firebase Spark 與選配 Google Cloud 專案的邊界；天氣依產品決定移除。
- Firebase 設定精靈不再假設 `firebaseConfig` 一定包含 `databaseURL`。使用者可從 Realtime Database「資料」頁籤另外複製資料庫網址，Travel OS 會自動合併並驗證；Firebase 操作路徑同步改為繁體中文介面名稱。
- 瀏覽器本機資料改依部署路徑隔離。同一個 `username.github.io` 底下的不同 Travel OS repository，不再共用 IndexedDB 旅程、Firebase 設定、onboarding 狀態或主題。舊版未分路徑的共用資料不自動搬移，避免再次跨 repository 混用。
- 設定精靈六段式流程：網站 → Firebase → Google 地圖 → 登入 → 驗證 → 完成；Step 3 保留免 Key 外部導航，也可設定 Places／Routes 使用的受限 Browser Key。
- Firebase 精靈明確要求 Spark、Email/Password、Realtime Database Locked mode 與 Travel OS Rules，並提供 Rules 一鍵複製與 `firebaseConfig` 解析預覽。
- Google Maps 外部 URL 不需要 API Key；站內 Places／Routes 需要另一個 Google Cloud 專案、對應 API、網站/API 限制及 Google 要求的計費設定，不可對 Firebase Spark 專案連結帳單。
- Self-host 第一次使用改以 Firebase 雲端同步為 onboarding 主流程，本機 IndexedDB 保留為 Demo／離線／fallback。
- Step 5 在使用者自己的 UID 範圍測試 Firebase 寫入、讀取與刪除；成功後才記住公開 Web config。Firebase Auth 改為僅記憶體登入。
- 密碼與 Server Key 永不保存。選配 Browser Key 預設只留在記憶體，使用者可明確選擇記住此裝置，並必須設定網站與 API 限制。
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
