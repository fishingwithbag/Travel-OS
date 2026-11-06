# Google 真實服務與旅伴降級驗證（2026-11-06）

在建立者既有測試專案與受限 Browser Key 上實測，沒有建立新憑證、調整網站／API 限制、變更計費方案或啟用天氣。控制台顯示免費試用仍有效；此為本輪環境紀錄，不代表任何用量皆免費。

## 已執行結果

| 項目 | 真實結果 |
|---|---|
| 服務與 Key | 控制台確認 Maps JavaScript API、Places API (New)、Routes API 已啟用；既有 Key 只允許三項 API 並有網站來源限制 |
| 日本景點搜尋 | 實際搜尋東京站、上野站，鍵盤選取建議後成功取得地點預覽與 Google attribution |
| 保存及加入行程 | 點「使用此地點連結」，手動填寫景點名稱與備註後保存；兩個 Place ID 連結均加入行程，重新載入後景點與連結仍保留 |
| 開車／Place ID | 東京站至上野站實際回傳約 3.7 公里、9 分鐘，顯示收費路段與高速公路警告 |
| 步行／Place ID | 相同兩站回傳約 3.2 公里、47 分鐘 |
| 開車／手動地址 | 改為手動輸入 Tokyo Station、Ueno Station 後，實際回傳約 3.7 公里、9 分鐘 |
| 三群組分流 | 從 0 依序新增 A／B／C 三群組；東京站共有、上野屬 A、晴空塔屬 B。A 回傳約 3.7 公里／9 分鐘，B 約 9.5 公里／21 分鐘；C 只有共有起點，不產生虛構路段 |
| 變更失效 | 從開車改步行，原結果清空；切到沒有安排的第二天顯示無可估算路段，不混入第一天結果 |
| 手動 0 分鐘 | 保存後顯示「手動時間：0 分鐘（優先採用）」；再次按估算進入已有結果／手動時間分支 |
| 未列入來源的測試頁 | 使用相同 Key，在未列入允許來源的另一個本機 port 測試；估算顯示失敗、停止本批後續請求，兩筆安排與原備註保留，沒有顯示假距離／時間 |
| 旅伴缺 Key | 由網站設定檔管理的頁面提示聯絡建立者，不再要求旅伴貼自己的 Key；Google 設定視窗不顯示可編輯的 Key 欄位 |
| 缺 Key 的手動保存 | 搜尋失敗提示後，景點名稱與備註草稿仍保留，可手動保存；重新載入後編輯視窗讀回相同備註。該頁沒有載入 Google SDK script |
| 窄版搜尋 | 在真實瀏覽器的 390px iframe 中完成 Google 建議搜尋及鍵盤選取；可視內容寬 375px（扣除捲軸），文件寬相同，對話框寬 337px，無水平溢出 |
| 明暗主題 | 搜尋框原先自行採用系統深色，與網站淺色不符；改為繼承網站 color-scheme 後，實測 light／dark 正確切換，最後恢復原主題 |

距離、時間及警告是當次服務回傳的快照，不是固定預設。Google 預覽內容未作為作者旅程範本或預設資料。Key 只在驗收分頁記憶體使用，未勾選記住裝置、寫入 Git、備份或網站頁面網址；SDK 請求依 Google 規範傳送 Browser Key。

未允許來源的失敗與允許來源的成功形成對照，**推斷**與網站限制有關；瀏覽器工具沒有提供原始服務錯誤碼，因此不將它宣稱為已量測的 HTTP 403 或額度耗盡案例。沒有為測試刻意耗盡免費額度、停用既有 API 或放寬 Key。

## 本批修正

- 搜尋與估算共用網站建立者／旅伴身分判斷；缺設定時依身分給出可執行指引。
- 修正歡迎文案更新到錯誤段落的選擇器，保留原標語並更新真正的說明。
- 本機替代模式、成員邀請及帳號提示改以網站身分說明；不要求旅伴操作 Firebase Console。
- Google 搜尋元件以官方支援的 `color-scheme` 繼承網站主題，沒有修改元件封閉的內部 DOM。

本機 178 項單元、Rules 產生一致性及 production build 通過；Rules 未變更。權限證據及 CI 仍依提交版本分別記錄。

## 證據邊界與下一步

- 真實服務成功及一般拒絕降級已實測；API 停用、配額耗盡等仍保留模擬測試與官方設定核對，不宣稱每個後端錯誤碼都曾實際觸發。
- 390px 為真實瀏覽器內的響應式框架，並非實體手機觸控或 Safari 的實測證據。
- Google 正式 Pages 來源、跨裝置及網站建立者完整發布流程仍待驗收。
- 真實 viewer／editor 直接越權請求由獨立本機驗收頁執行，不以 Google 成功或唯讀按鈕停用替代。

## 官方依據

- [PlaceAutocompleteElement 選取與欄位載入](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Google 搜尋元件支援的 CSS 屬性](https://developers.google.com/maps/documentation/javascript/reference/places-widget)
- [Route 請求的地點類型、距離與時長欄位](https://developers.google.com/maps/documentation/javascript/reference/route)
- [Browser Key 安全限制](https://developers.google.com/maps/api-security-best-practices)
