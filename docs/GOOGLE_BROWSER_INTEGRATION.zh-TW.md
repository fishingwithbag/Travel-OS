# Google 瀏覽器功能恢復紀錄

## 狀態與邊界

2026-10-18：SDK 載入模組已接入景點新增／編輯視窗的選用 Google 搜尋。可選取、預覽名稱／地址／座標與來源、確認帶入 Place ID 地圖連結；名稱與私人備註仍由使用者填寫。**尚未通過真實 Google 服務驗收，設定精靈及自動交通估算仍未完成。** 無新依賴、沒有更動 Firebase Rules、沒有使用真實 Key 發出請求，也沒有更動任何雲端計費設定。

`src/providers/google-loader.js` 提供 `loadGoogleLibrary(key, 'places' | 'routes')`：

- 僅明確呼叫時載入 Google 官方 SDK；匯入模組、缺 Key、格式錯誤及公開體驗站都不發出請求。
- Key 只保留在本分頁記憶體，不寫入備份、Firebase、儲存空間或頁面網址。瀏覽器 SDK 必須把 Key 送至 Google 的載入網址，因此瀏覽器 Key 不是伺服器祕密；維護者必須設定網站與 API 限制。
- 同時呼叫共用一次 SDK／相同 library 載入；不預載其他 library。SDK 初始化只代表可呼叫 API，不代表 Places、Routes、授權、額度或計費已驗證。
- 下載／初始化／library 載入最多等待 20 秒。應用程式錯誤不包含 Key 或原始 SDK 錯誤；Google 自身的主控台訊息不由此模組控制。
- 認證失敗會封鎖後續使用；library 載入失敗可由使用者明確重試，不自動連續送請求。
- SDK 為全頁全域物件，刪除 script 無法卸載。切換 Key 或 SDK 初始化失敗後，必須保存草稿並重新載入；不假裝已切換到新專案。設定精靈尚須接上這項流程。

## 下一批介面與資料決策

1. 使用 Google 官方 `PlaceAutocompleteElement`，保留其建議清單及來源標示，處理 `gmp-select` 與錯誤事件。選取後才要求必要欄位，避免每次按鍵都額外取得詳情。
2. API 回傳的名稱、地址與座標需與使用者手動資料分開。Place ID 可長期保存；其他內容不得直接當作永久旅程資料寫入 IndexedDB、Firebase 或 JSON 備份。接入前須完成顯示、保存與重新取得策略，包含第三方 attribution、公開隱私與使用條款。
3. 保留手動景點、停車與免 Key Maps URLs；Places 不可用時顯示具體錯誤，不清空草稿，不把外部導航成功當成站內搜尋成功。
4. Routes 使用瀏覽器支援的功能另做真實驗證；本批載入 `routes` library 的模擬成功不代表已計算任何真實距離或時間。
5. Firebase 維持 Spark。Google Maps 的啟用、計費、SKU 免費額度與配額需要另外驗證；若啟用須連結計費的 Google 服務，設定指南應採獨立 Google Cloud 專案以免更動 Firebase Spark 專案。不把免費額度說成無上限免費，也不以移除需求達成免費宣稱。

## 驗證

載入器 10 項模擬測試加上搜尋 8 項測試，涵蓋無 Key、載入／詳情逾時、授權失敗、過期選取、關閉後晚到結果、搜尋 Enter 不提交表單、僅保存 ID 連結及導航沿用 ID。全套 135 項單元測試與建置通過。測試沒有呼叫 Google，不能取代真實服務驗收。

本機實際桌面瀏覽器：建立合成旅程，在景點視窗展開搜尋，空 Key 顯示修正訊息；名稱與備註未清除，仍可保存，重整後仍存在；主控台無錯誤。沒有真實 Key，未把模擬成功列為真實搜尋成功。使用條款與隱私說明由相對路徑 `service-notice.html` 提供。

尚待：精靈整合、Places 真實選取與保存驗收、Routes 計算、真實 Key／未啟用 API／配額不足、新手流程、手機與桌面真實 widget，以及清除／切換設定。現階段每次開啟景點視窗需重新輸入 Key，後續統一到精靈；混合手動與 Place ID 的多站導航中，只有所有中途站都有 ID 時才傳 waypoint_place_ids，其餘維持文字中途站。以上完成前 WP1–WP3 不關閉。

## 官方依據

- [SDK 載入方式與 importLibrary](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [認證失敗回呼](https://developers.google.com/maps/documentation/javascript/events#auth-errors)
- [Autocomplete widget 與選取事件](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Places 保存限制及 attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Maps 錯誤修復](https://developers.google.com/maps/documentation/javascript/error-messages)
- [Google Maps 計價概覽](https://developers.google.com/maps/billing-and-pricing/overview)
