# Google Places／Routes 真實服務驗證

日期：2026-10-29

候選版本：`feature/release-readiness`（驗證開始時 `8cf6f24`）

測試網址：`http://127.0.0.1:5182/`

## 本輪結果

- Google Cloud 已啟用 `Maps JavaScript API`、`Places API (New)` 與 `Routes API`；Weather API 不在 Travel OS 金鑰白名單。
- 建立專用瀏覽器 Key，API 限制只有上述三項；HTTP referrer 僅允許 `127.0.0.1:5182`、`localhost:5182` 與正式 GitHub Pages 子路徑。
- Key 只在瀏覽器工作階段用於驗收，未寫入 repository、文件、旅程、備份或 Firebase，亦未在報告記錄值。
- 設定頁的 Places 與 Routes SDK 載入檢查均成功。
- Places 真實搜尋 `Tokyo Station` 與 `Tokyo Tower`，Google 建議、地址、座標及 Maps 連結均成功回傳；兩筆暫存景點可保存並加入每日行程。
- Routes 真實計算 `Tokyo Station → Tokyo Tower` 成功，候選版顯示約 **3.7 公里／12 分鐘**，並保留外部導航及手動交通時間降級路徑。
- 本輪沒有啟用 Weather API、沒有建立 Server Key、沒有接收 service account 或把憑證提交至 Git。

## 計費與方案事實

本次真實 Google 測試沿用使用者指定的測試專案；公開報告不記錄 Project ID、帳號或帳單識別。連結 Google Maps Platform 帳單後，Firebase 控制台顯示 **Blaze／免費試用**，而非 Spark。這證實同一 Project ID 不能作為「Firebase 維持 Spark」的發布驗收證據。

因此本輪可關閉「程式是否能實際呼叫 Places／Routes」的技術缺口，但不能勾選「陌生使用者以 Firebase Spark 完成全部站內 Google 功能」或「永久零費用」門檻。正式指南仍應要求：Firebase Spark 與需要 Billing 的 Google Maps Platform 使用不同 Project ID；不願設定 Billing 的使用者使用免 Key 外部 Google Maps 導航、手動地點及手動交通時間。

## 尚未完成

1. 以不同 Project ID 的 Firebase Spark 與 Google Cloud Maps 專案，從全新瀏覽器重跑完整 Step 1–6。
2. 正式 GitHub Pages 網址實際載入受限 Key，重測 Places 與 Routes。
3. API 拒絕、額度不足、離線及網站限制錯誤的真實瀏覽器提示。
4. 真實多帳號 owner／editor／viewer、撤權、跨裝置即時同步、雲端備份還原。
5. 驗收暫存景點與兩筆每日安排尚留在本機測試資料；刪除前需由帳號持有人於操作當下確認。
