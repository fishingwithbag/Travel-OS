# 部署與離線驗收

日期：2026-11-02（Asia/Taipei）。候選分支：`feature/release-readiness`。

## CI 與版本

`0a14219` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41466362363) 全部成功。新增快取修正後，本機 28 個測試檔、172 項測試與 production build 通過，依賴稽核為 0 vulnerabilities。

## 修正

- production worker 在建置時取得由 bundle 內容產生的版本識別；內容變更會產生新快取名稱。
- 以 Service Worker scope 區隔快取，啟用新版本時只清除此部署路徑的舊版本，不影響同一網域的其他網站。
- 預先快取首頁、建置的 JS／CSS（包含延遲載入模組），避免首次載入尚未受 worker 控制時遺漏必要資源。
- 合成測試涵蓋內容版本更新、相對路徑、快取 scope 隔離、延遲快取寫入與 quota 失敗。

## 真實瀏覽器操作

- 以純靜態 HTTP 伺服器提供 production 產物，驗證 `/` 與 `/Travel-OS/`，資源使用相對雜湊路徑。
- 內建瀏覽器在子路徑建立 2027-12-31 至 2028-01-02 的合成旅程，重整保存；根路徑首次開啟仍為空白，兩個部署的本機旅程未混用。
- Chrome 在子路徑建立同期間旅程後，實際停止該 HTTP 伺服器，再重整並操作每日行程；排版、日期及旅程完整讀回。
- 停服期間新增景點、備註與主停車場成功。恢復伺服器後重新整理，所有新增資料保留。
- 內建瀏覽器在同樣停服測試中只保留原始 HTML，未成功載入樣式與應用程式，因此這個環境的離線流程仍記為失敗；Chrome 成功不代表所有瀏覽器都通過。

## Google 搜尋拒絕實測與審查

- Chrome production 候選版先填寫手動景點名稱／備註，缺 Key 時顯示設定指引。
- 套用未記住裝置的合成無權限 Key，於 Google 原生搜尋框輸入 Tokyo Station。實際服務拒絕後顯示「Google 搜尋無法完成」與 API／Key／網路／額度修正指引。
- 手動名稱及備註完整保留，可繼續儲存景點並提供免 Key Maps 連結。這是拒絕測試，不是實際耗盡付費額度的測試。
- 掃描 81 個可達 commits 與目前 dist：未命中完整 Google Key、GitHub PAT 或私鑰標頭模式。此結果限於所列模式，不等於完整人工隱私審查。
- 186 個依賴套件的 license 為 0BSD、Apache-2.0、BSD-3-Clause、ISC 或 MIT；lockfile 根專案項目無 license 欄位，專案授權另由根目錄 LICENSE 提供。
- `2c5f774` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41467832190) 全部成功，包含 Rules Emulator。

## 外部環境阻擋

正式 GitHub Pages 的線上更新與離線重測仍待完成。第二 Firebase Spark 專案 ID、editor／viewer 真實登入尚未取得；不能以 Google 帳號 Email 代替專案 ID。完整新手流程與多人權限門檻保持待驗，暫不宣告完整發布。

目前 Firebase Console 可見測試專案仍顯示 Blaze／免費試用，使用者重新載入後仍只有 owner；可見專案清單未出現另一個指定的 Spark 測試專案。未更動計費、正式原站或既有使用者。GitHub 連接器更新 PR #3 說明回傳 403 後，使用既有 Git 認證透過 GitHub API 成功套用 `PR_RELEASE_READINESS.md` 的中英文說明。

## 八項流程狀態

| 項目 | 結果 |
|---|---|
| 1 最新 CI | 已通過，候選版 `2c5f774` |
| 2 部署及離線 | 根／子路徑、本機隔離、Chrome 停服與恢復通過；正式 Pages 及內建瀏覽器離線仍待處理 |
| 3 Google 錯誤流程 | Places 實際拒絕與草稿保存通過；Routes 已有成功／拒絕證據；未實際耗盡額度 |
| 4 Firebase 跨專案 | 缺第二個指定的 Spark Project ID／設定與登入 |
| 5 全新 Spark 設定 | 缺可執行的新 Spark 測試環境；目前 Console 顯示 Blaze |
| 6 真實多人 | 缺 editor／viewer Authentication 使用者與登入 |
| 7 發布審查 | 本機測試、部分憑證模式、套件授權及 PR 中英文說明已核對；最終待發布版本仍須重驗 |
| 8 合併及發布 | 前置門檻未全數通過，尚未合併 main 或建立完整發布版本 |
