# Google Maps 導航說明

Travel OS 目前透過 [Google Maps URL](https://developers.google.com/maps/documentation/urls/get-started) 開啟外部地圖網站。輸入景點名稱、地址或 Google Maps 分享連結後，可以從「下一個安排」或每日時間軸開啟目的地與停車場。這項功能不需要 Google Cloud project、Billing 或 API Key。

設定精靈的 Step 3 只說明這項功能，直接按「下一步」即可登入自己的 Firebase。Step 5 會測試 Firebase Authentication 與本人 UID 範圍內的 Realtime Database 寫入、讀取、刪除；不會載入 Maps JavaScript API 或 Places。

若未來加入站內地圖、Places 地點搜尋或自動完成，才需要依實際功能啟用對應 API，在獨立 Google Cloud project 設定 Billing、Website/API restrictions、quota 與預算通知。Browser Key 可以在瀏覽器中被看見，不能當成私密憑證。Routes、Geocoding、Weather 等伺服器 API 所需的 Server Key 必須留在自己的後端，不能貼到 Travel OS 前端或公開 repository。
