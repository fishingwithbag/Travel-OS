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

## 尚待完成

正式 GitHub Pages 的線上更新與離線重測仍待完成。第二 Firebase Spark 專案 ID、editor／viewer 真實登入尚未取得；不能以 Google 帳號 Email 代替專案 ID。完整新手流程與多人權限門檻保持待驗，暫不宣告完整發布。
