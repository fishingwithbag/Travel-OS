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
