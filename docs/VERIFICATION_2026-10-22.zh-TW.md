# 真實 Spark 與候選版驗證紀錄

日期：2026-10-22（Asia/Taipei）。本報告記錄真實服務與候選版目前可核對的結果；尚未完成的操作維持未通過，不以程式存在或 Emulator 結果替代。

## 已確認

- Firebase 控制台顯示獨立測試專案為 **Spark／每月 0 美元**，未升級 Blaze。
- Realtime Database 規則編輯器已載入目前不可變完整版本規則，包含 `head`／`versions` 寫入與 revision 防護；頁面沒有未發布變更按鈕。
- 候選版 Step 2 可解析 Firebase Web config 與獨立 database URL，並進入 Step 4 登入。若誤把 Realtime Database Rules 貼入 config 欄位，現在會立即清除舊的成功預覽並指出正確複製位置，不會拖到 Step 5 才顯示籠統錯誤。
- Step 3 已明示 Google Cloud Project ID 不可與上一步 Firebase 專案相同；若 Google 要求替 Firebase 專案設定帳單，使用者必須取消。
- production build 的 Step 3 包含上述防呆。390px 與 320px 實際瀏覽器檢查均無頁面層級橫向溢出，主控台沒有 warning 或 error。
- Step 5 已以真實 Firebase Authentication 完成本人診斷路徑的寫入、讀取與刪除；雲端連線成功後可載入既有旅程。
- 已在真實 Spark 建立跨年、跨時區的雲端旅程，保存並重登讀回景點、備註、目的地地圖、主／備停車、兩個群組、航班與不同幣別費用。含 HTML 標記的備註以純文字安全顯示。
- 私人 JSON 備份已實際下載並解析，`schemaVersion`、旅程、景點、行程、停車與航班存在；尚待在乾淨雲端狀態還原副本。
- CRUD 刪除驗收使用的暫存景點已從真實 Firebase 刪除；刪除後景點庫由 2 筆變為 1 筆，正式驗收景點、每日安排、停車、航班、群組及費用均保留。
- 原版彩色 Google Maps、編輯、收藏、停車、設定與主題圖示已逐項移植到通用程式，保留去個人化資料模型；桌面瀏覽器已確認更新後的 NEXT 卡片、圖示與操作文字正常顯示。
- 本批 `npm run check` 通過：154 個單元測試與 production build 成功。Rules Emulator 在本機因 Windows Java loopback selector 無法啟動，規則本身未變更，交由本批 GitHub CI 再驗證。

## 本輪發現與處置

在同一 Firebase 專案嘗試進入 Google Maps API 啟用流程時，Google Cloud 要求連結帳單。這會使 Firebase 專案離開 Spark，違反產品要求，因此已取消，沒有啟用 API、建立 Key 或送出計費變更。

精靈、README、Google Cloud 指南及 Changelog 已同步說明兩個專案的邊界：Firebase 專案維持 Spark；選配站內 Places／Routes 使用另一個 Google Cloud 專案。免 Key 外部導航、手動地點與手動交通時間不受影響。

## 尚待實走

1. 在乾淨雲端狀態還原私人備份，以及另一裝置讀回。
2. 第二個 Firebase Authentication 使用者的 viewer／editor、撤權、禁止升權與即時同步。
3. 使用不同 Project ID 的 Google Cloud 測試專案驗證 Places 搜尋、Routes 估算、Key 網站/API 限制，以及 API 未啟用、限制錯誤與額度失敗的降級。
4. 手機版完整操作、正式 GitHub Pages 子路徑、Service Worker 更新、全歷史憑證／個資掃描與最終 beta 發布。

目前不能宣告符合「陌生使用者可完整順暢使用所有功能」的發布標準。
