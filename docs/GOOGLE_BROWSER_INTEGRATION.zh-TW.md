# Google 瀏覽器功能整合與驗證

更新：2026-10-20。站內景點搜尋、交通估算與設定精靈已接入；真實 Google API 尚待測試專案驗收，不能以 SDK 載入或模擬測試代替。

## 使用流程

1. Firebase 同步維持 Spark；免 Key 外部導航與手動行程可直接使用。
2. 若使用 Google 站內功能，使用獨立 Google Cloud 專案，依官方條件啟用 Maps JavaScript API、Places API (New)、Routes API，設定網站與 API 限制。免費額度不是無上限免費；預算通知不會停止收費。
3. 在精靈 Step 3、景點搜尋或每日估算開啟同一個「Google 功能設定」。貼上瀏覽器 Key 並套用；預設僅本分頁，明確勾選才記住於此網站的瀏覽器儲存空間。
4. SDK 檢查僅確認 library 可載入。新增景點實際搜尋／選取，再建立兩站實際估算，兩項都成功才算服務通過。
5. Step 5 僅驗證 Firebase 登入與本人範圍讀寫；完成頁不宣稱 Google 已驗證。

## 資料與請求邊界

- Key 不寫入旅程、Firebase、備份或頁面網址。SDK 載入網址必須傳給 Google，瀏覽器 Key 應搭配網站與 API 限制。
- 匯入模組、缺 Key、錯誤格式、公開體驗站均不主動呼叫 Google；恢復記住設定也不預載 SDK。
- 搜尋使用官方 widget；選取後取得必要欄位，短暫呈現名稱、地址、座標及 attribution。只帶入 Place ID 連結，使用者自行填寫名稱／私人備註。
- 每日交通依群組及時間排序，共同安排加入各組；不跨越航班／交通安排接線。開車不採即時交通，步行不傳開車選項；其他交通方式保留手動／外部導航。
- 手動分鐘含 0 優先。每批最多 20 個邏輯路段，同批相同起終點及模式共用請求；服務失敗停止餘下路段。僅按鈕觸發，沒有背景重試。
- 結果只留於當前畫面，旅程、revision、日期、Google Key 或儲存專案切換均失效；晚到結果不得覆蓋新情境。警告及錯誤安全呈現。
- 請求最多等 20 秒；SDK 無法卸載。停用清除設定及搜尋預覽，換 Key 必須先保存草稿並重新載入。已送出的網路請求不能撤回。
- 本批未改 Firebase Rules、未部署 Functions、未更動雲端計費。

## 本批驗證

150 項單元測試及正式建置通過，包括 loader、Places、Routes、集中設定及 UI 批次控制。模擬覆蓋地址／Place ID、最小回傳欄位、步行、無路線、逾時、服務失敗停止、20 路段限制、去重、手動 0 分鐘、專案／日期切換及晚到結果。

真實本機瀏覽器已操作跨年旅程、兩站、手動 0 分鐘、Key 格式錯誤與清除、缺 Key 搜尋、設定視窗返回草稿、儲存並重整。390px 設定視窗可操作；320px 發現 body 最小寬度造成水平溢出，已修正，實測 document 寬度與可視寬度一致。未使用真實 Key，未把這些結果列為 Google 成功驗收。

待驗：真實搜尋及 Routes、API 未啟用／限制／額度、真實 widget 手機及鍵盤、多帳號 Spark、完整首次設定、根路徑及子路徑正式部署。WP1–WP3 仍未關閉。

## 官方依據

- [SDK 載入](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Autocomplete widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Places 保存與 attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Routes 計算](https://developers.google.com/maps/documentation/javascript/routes/get-a-route)
- [Route 欄位與模式](https://developers.google.com/maps/documentation/javascript/reference/route)
- [錯誤修復](https://developers.google.com/maps/documentation/javascript/error-messages)
- [計價與額度](https://developers.google.com/maps/billing-and-pricing/overview)
