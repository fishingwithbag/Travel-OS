# Google Maps 導航與站內功能

Travel OS 的基本導航透過 [Google Maps URL](https://developers.google.com/maps/documentation/urls/get-started) 開啟外部地圖網站。輸入景點名稱、地址或 Google Maps 分享連結後，可以從「下一個安排」或每日時間軸開啟目的地與停車場；這部分不需要 Google Cloud project、Billing 或 API Key。

站內景點搜尋與交通時間／距離估算是選用功能，需要 Maps JavaScript API、Places API (New)、Routes API 與受限瀏覽器 Key。請建立**另一個 Google Cloud 專案**；它的 Project ID 不可與 Firebase Spark 專案相同。Maps 啟用流程要求連結帳單，若沿用 Firebase 專案，Firebase 會改為 Blaze。看到 Google 要你替 Firebase Project ID 設定帳單時，請取消，不要繼續。

Google Cloud 免費試用有期限，不能當成永久零費用保證。不願連結任何帳單的使用者可略過站內功能；外部導航、手動地點與手動交通時間仍完整可用。

設定精靈 Step 3 可開啟「Google 功能設定」貼入瀏覽器 Key；也可以直接按「下一步」略過。Step 5 只測試 Firebase Authentication、目前 Rules 儲存格式，以及本人 UID 範圍內的 Realtime Database 寫入、讀取與刪除，不會把 Firebase 成功誤報成 Google 成功。

在獨立 Google Cloud project 啟用三項 API 後，建立 Browser Key，網站限制只允許自己的 GitHub Pages／自訂網域，API 限制只允許 Maps JavaScript API、Places API (New) 與 Routes API。Browser Key 可以在瀏覽器中被看見，不能當成私密憑證；限制與 quota 是必要防護，預算通知不會自動停止用量。Travel OS 不接收 Server Key、service account 或私鑰。

驗證時先在「新增景點」實際搜尋並選取，再安排兩個非航班／交通站點，按「估算剩餘路段」。SDK 載入成功不等於 Places 與 Routes 都成功；兩項都成功才算站內 Google 功能通過。API 未啟用、Key 限制錯誤、額度或網路失敗時，應顯示具體錯誤並保留手動資料。
