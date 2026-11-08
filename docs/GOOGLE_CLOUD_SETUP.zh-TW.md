# Google Maps 導航與站內功能

Travel OS 的基本導航透過 [Google Maps URL](https://developers.google.com/maps/documentation/urls/get-started) 開啟外部地圖網站。輸入景點名稱、地址或 Google Maps 分享連結後，可以從「下一個安排」或每日時間軸開啟目的地與停車場；這部分不需要 Google Cloud project、Billing 或 API Key。

站內景點搜尋與交通時間／距離估算是選用功能，需要 Maps JavaScript API、Places API (New)、Routes API 與受限瀏覽器 Key。由**網站建立者**管理服務專案，可以沿用 Firebase 所在的 Blaze／免費試用專案，不強制另建。受邀旅伴不需要各自建立 Google Cloud 或設定計費。若建立者選擇保留 Firebase Spark，才需另行安排 Maps 專案。

Google Cloud 免費試用有期限，不能當成永久零費用保證。不願連結任何帳單的使用者可略過站內功能；外部導航、手動地點與手動交通時間仍完整可用。

設定精靈 Step 3 可開啟「Google 功能設定」貼入瀏覽器 Key；也可以直接按「下一步」略過。Step 5 只測試 Firebase Authentication、目前 Rules 儲存格式，以及本人 UID 範圍內的 Realtime Database 寫入、讀取與刪除，不會把 Firebase 成功誤報成 Google 成功。

建立者在所選 Google Cloud project 啟用三項 API 後，建立 Browser Key，網站限制只允許自己的 GitHub Pages／自訂網域，API 限制只允許 Maps JavaScript API、Places API (New) 與 Routes API。Browser Key 可以在瀏覽器中被看見，不能當成私密憑證；限制與 quota 是必要防護，預算通知不會自動停止用量。Travel OS 不接收 Server Key、service account 或私鑰。

網站限制請包含協定與 hostname，例如 `https://你的帳號.github.io/*`；不要將 `https://你的帳號.github.io/Repo/*` 當成可靠的隔離邊界。[Google 官方文件](https://developers.google.com/maps/api-security-best-practices#restricting-api-keys)提醒，多數瀏覽器會從跨站請求的 `Referer` 移除路徑，只有 Repo 路徑的設定可能造成 SDK 載入後搜尋／估算仍遭拒絕。hostname 範圍會涵蓋該 hostname 下其他 Repo 網站，建立者需確認這個範圍；若需隔離不同網站，應使用獨立 hostname 與專用 Key。不要以取消所有網站限制來排錯。

驗證時先在「新增景點」實際搜尋並選取，再安排兩個非航班／交通站點，按「估算剩餘路段」。SDK 載入成功不等於 Places 與 Routes 都成功；兩項都成功才算站內 Google 功能通過。API 未啟用、Key 限制錯誤、額度或網路失敗時，應顯示具體錯誤並保留手動資料。
