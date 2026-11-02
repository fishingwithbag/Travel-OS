# Firebase 雲端還原驗證

日期：2026-11-02（Asia/Taipei）

候選版本：`feature/release-readiness`

## 測試環境

- Firebase 專案：`travel-os-first-run-test`
- 身分：Firebase Authentication owner 測試使用者
- 網站：本機候選版 `http://127.0.0.1:5182/`
- 備份：`travel-os-private-2026-10-22.json`，只含合成驗收旅程

密碼、Firebase Web config 與 API Key 未寫入 repository、報告或聊天。

## 操作結果

1. Step 5 成功登入，完成本人 UID 範圍的 Realtime Database 寫入、讀取及刪除診斷。
2. 私人備份上傳後，匯入預覽辨識 4 趟旅程、7 筆安排、1 個景點及完整備份類型。
3. 雲端模式只允許選擇一趟旅程還原，並明示既有旅程不會被覆蓋、原專案設定與成員權限不會帶入。
4. 選擇「發布驗收示例 2026-10-11」後，畫面顯示「已還原為新的雲端旅程；原旅程保留」。
5. 旅程清單同時出現原旅程與新建立的同名旅程；新旅程包含「驗收小隊 A」、「驗收小隊 B」及目前 owner 成員。
6. 重新整理後，應用程式按安全設計清除密碼並回到 Step 4。再次輸入 owner 密碼、通過 Step 5 後，Firebase 重新讀回同一份還原旅程、群組及 owner 資料。

## 結論與邊界

A16 的真實雲端匯入預覽、非覆蓋式還原及重新登入讀回已通過。私人／分享匯出與錯誤檔案防呆沿用既有瀏覽器及單元測試證據。

本次沒有刪除還原資料、修改成員權限或測試第二 Firebase 專案。A15 owner／editor／viewer 真實多人權限、A17 第二專案切換與正式 Pages 仍是發布阻擋項目。

## 後續安排與文件核對

- 依使用者指示暫緩 A15 真實多人驗收，不將暫緩視為通過。
- 修正自行部署指南仍寫成僅有免 Key 導航的舊說明，對齊現有 Step 3 的選配 Places／Routes 功能與獨立專案設定指南。
- README 狀態對齊已有真實 Google 成功及 Firebase 雲端還原證據，並保留未完成門檻。
- 文件提交 `bb7145a` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41465260385) 已成功。

## 部署快取檢查

- 階段性文件提交 `9050463` 已與遠端分支一致，GitHub Actions 回報成功。
- 開發模式不再註冊 Service Worker，避免新的開發工作階段建立 production 離線快取；這項調整不會自動移除先前已註冊的 worker，也無法替代持續運行的本機伺服器。
- 修正靜態資源快取在非同步開啟 Cache Storage 後才 clone response 的競態：先 clone，再用 `event.waitUntil` 保護寫入生命週期。Cache Storage 失敗時，網路成功回應仍可使用。
- 新增延遲開啟快取、先消耗網路 body、寫入生命週期及 quota 失敗案例，170 項單元測試與 production build 通過。
- 新的本機瀏覽器分頁載入兩份樣式表，中文字型與排版正常，無水平溢出，Console 為 0 error／0 warning。
- 以上為候選版本機證據；正式 Pages 更新／離線切換仍保留待驗。
