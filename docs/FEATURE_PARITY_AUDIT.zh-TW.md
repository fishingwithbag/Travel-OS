# 原站功能與開源版差異核對

核對日期：2026-10-12。這是程式盤點與修復清單，不是完整驗收通過證明。

下表記錄初始盤點；後續已恢復項目及驗證結果列在文末，最新追加日期為 2026-10-13。

## 正確範圍

保留原站實用功能與視覺品質，去除作者旅程、國家、日期、成員、服務設定，讓使用者透過精靈接上自己的服務。Firebase 使用 Spark，目標為免費使用。天氣依使用者明確決定移除，不補替代天氣服務。其他功能不能因設定較複雜或尚未完成，就自行改成不在範圍內。

## 本次讀取的版本

| 來源 | 核對版本 | 限制 |
|---|---|---|
| 原旅遊網站 | 本機及遠端 main 均為 `bebe07f` | 根版與 `travel-os/` 子版均讀取；`functions/` 未追蹤，部署保護腳本有本機修改，保持唯讀 |
| 正式開源 Travel-OS | 遠端 main `c61f21c`；本機設定精靈分支 `f27d238` | 已 fetch，不能把分支功能誤認成主站已上線 |
| 獨立首次設定測試版 | 遠端 main `678863e`，包含 `a51dcba` | 已 fetch；Spark 精簡修改在這裡，尚未同步成正式開源版 |

下表「原站」路徑是來源程式的相對位置，沒有把私人來源檔案複製到本儲存庫。根版作為本輪行為參考；子版同樣含 Places、收藏、費用、租車及行程函式，但版面結構不同。視覺仍需另做瀏覽器對照，不因函式同名就認定兩版完全相同。

## 功能對照與驗收缺口

| 功能 | 原站程式依據 | 開源版／測試版現況 | 恢復與驗收要求 |
|---|---|---|---|
| 多旅程、任意國家日期 | 原站 `travel-os-ui.js:15`、固定日期邏輯 | `src/domain/trip.js:createTrip/tripDates` 已通用化 | 保留跨月跨年、不得帶入私人示例 |
| 景點資料庫與分類篩選 | 原站 `index.html:1382 allPlaces`、`:1706 render`、`:1743 buildRegionTags` | 只有行程項目，沒有獨立景點庫與篩選 | 恢復新增、編輯、分類、搜尋、加入行程 |
| Google 地點搜尋及地址座標 | 原站 `index.html:1430 initGooglePlaces`，`PlaceAutocompleteElement` + `fetchFields` | 正式 main 曾有 loader；測試版 `a51dcba` 移除 Places 與 Key 入口 | 恢復實際 consumer；不可只放一個不工作的 Key 欄位；移除固定日本限制 |
| 收藏與收藏篩選 | 原站 `index.html:1549 toggleFav`、`:1981 setFavoriteFilterState` | 缺少 | 按旅程隔離收藏，支援取消收藏及篩選 |
| 行程新增、編輯、刪除 | 原站 `itinerary.html:1823 openNewItemModal` 與表單事件 | `src/app.js` 只有新增安排，缺少編輯刪除 UI | 已存內容可修改與移除，失敗不丟資料 |
| 開始／結束時間與時長 | 原站 `itinerary.html:938 itemClockDuration`、`:1512 setEndByStartAndPlace` | 只有開始時間 | 恢復停留時間、結束時間；跨日不可誤算 |
| 排程衝突提示 | 原站 `itinerary.html:1001 buildScheduleWarnings` | 缺少 | 依動態群組及前段交通時間計算，不固定兩車隊 |
| 下一站備註、地圖、停車 | 原站 `travel-os-ui.js:157 nextInfoHtml`；`:289 openDetail` | 已有備註、主要／備用停車與地圖 | 已有 UI 不代表所有原欄位齊全；手機與長備註需保留 |
| 多群組整日導航 | 原站 `itinerary.html:1031 routeStopsFor`、`:1045 googleRouteUrl` | 正式版無此 UI；測試版只有相鄰兩站連結 | 恢復每群組全日路線；共有項目納入各群組，不混入別組；長路線分段，不能漏站 |
| 自動路程時間／公里 | 原站 `itinerary.html:1287 calculateAndStoreLeg` 呼叫 `calculateRoute` | 測試版曾有後端 consumer，`a51dcba` 刪除，改外連 | 外連不等同自動計算；保留恢復項，重新確認實作與免費條件 |
| 手動交通時間與模式 | 原站 `itinerary.html:995 effectiveTransitAfter`、`:1203 routeTravelMode` | 缺少獨立欄位 | 需與自動結果清楚區分，不能顯示假成功 |
| 地理編碼 | 原站 `itinerary.html:1248 resolveItemLocation`，未追蹤 `functions/index.js:159` | 測試版 `a51dcba` 移除 | 優先沿用選定地點座標，缺座標時才查詢；部署與支援方式待核對 |
| 分車停車資料 | 原站 `itinerary.html:1071–1178`，包含群組、主備、步行分鐘、費用及備註 | `cleanParking` 只有共用主備名稱／URL／備註 | 恢復動態群組欄位，導航目的地與停車場分開 |
| 航班 | 原站 `itinerary.html:1564 toggleFlightFields` | 已有機場、出發／抵達日期時區；測試版有起降顯示修正 | 保留手動完整欄位，不能帶原航班預設；日期時區驗證仍需核對 |
| 租車、取還車加入行程 | 原站 `index.html:2182–2203`、`itinerary.html:1616 normalizeRentalInfo`、`:1630 applyRentalPreset` | 缺少專用流程，通用交通項目不是完整替代 | 任意群組租車資料、取還車地點時間及加入行程 |
| 住宿 | 原站景點／stay 類型與原資料欄位 | 只有 stay 類型與備註 | 核對入住退房、預訂欄位；原私人住宿資料不得作 demo |
| 費用清單與分攤 | 原站 `index.html:2137 renderCostEntries`、`:2160 renderCostSummary` | 只有逐安排費用與各幣別合計 | 恢復獨立費用編輯及人數分攤；不得跨幣混加 |
| 同行者與同步協作 | 原站 `itinerary.html:753–809` presence／edit lock／onValue | 有 RTDB membership Rules、revision transaction；無成員管理 UI、即時訂閱與在線顯示 | 群組不等於授權；角色、邀請、更新與衝突需分別驗收 |
| 完整備份與分享副本 | 新開源需求；`createBackup/validateBackup` | 本機還原已實測；雲端 `replaceAll` 拒絕，逐趟匯入 UI 尚缺 | 雲端還原不能只報不可用；新增欄位必須 round-trip |
| 初始設定精靈 | `index.html`、`src/config/firebase-config.js` | Steps 1–2 已調整；Step 3 被改成只有外連說明 | 恢復 Google 能力設定及具體驗證，保留 Firebase Spark 指引 |
| 視覺／手機／鍵盤 | 原站 overview、today、detail 多視圖 | 目前單頁 timeline，已有部分手機與鍵盤測試 | 不能把精簡頁面當成原視覺完整移植，需逐流程比較 |
| 天氣 | 使用者明確排除 | 測試版已移除 | 維持移除；不新增替代服務 |

## 免費條件：已核實與未核實分開

1. [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) 不需 Key，可做搜尋及多站導航。手機瀏覽器最多 3 個中途點，其他平台最多 9 個；URL 長度也有限制。此能力不能冒充網站內的自動路程計算。
2. [Maps JavaScript 官方文件](https://developers.google.com/maps/documentation/javascript/usage-and-billing) 要求啟用計費與 Key。Places 依請求欄位計價，免費額度內可以零費用；不能推論為每次都要付錢，也不能承諾永遠不計費。原站請求含 `displayName`，不能直接套用只有 ID 的免費條件。
3. [Google 價格表](https://developers.google.com/maps/billing-and-pricing/pricing) 按 SKU 提供免費使用上限。原站 Routes DRIVE 指定 `TRAFFIC_AWARE`，不能不經查證就套用基本路線的級距。實際帳單與使用量本次未讀取。
4. [Firebase 方案文件](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) 區分 Spark 與 Blaze，連接 Cloud Billing 會影響 Firebase 方案。不能把「所有 Google 設定必須放在 Firebase 同一專案」當成前提；也不能把未部署的本機 Functions 當成 Spark 上線證據。
5. 尚待確認：使用者的免費要求是否允許 Google 專案啟用計費但只使用免費額度。這影響精靈及用量控管，不構成刪除功能的授權。Firebase 維持 Spark、天氣移除的要求不變。

## 範圍偏移的具體位置

- 正式 repo 的 `247f22f` 已把設定精靈導向 keyless maps。
- 測試 repo `a51dcba` 明確刪除 `src/providers/google-maps.js`、Functions、相關測試、Key 輸入及 app 呼叫。`docs/decisions/006-spark-free-only.md` 又把刪減後版本列為驗收基準，這超出了使用者對天氣移除的授權。
- 更早的通用核心沒有完整移植景點庫、租車、編輯與協作 UI；不是把 `a51dcba` 全部還原就能補齊。
- 不整筆 revert：該提交包含使用者要求的天氣移除；舊版也依賴與 Spark 不相容的後端部署方式。需逐功能恢復與測試。

## 後續實作順序

1. 撤回以精簡版為完整驗收標準的 ADR，保留历史紀錄；先恢復免 Key 的動態群組整日導航。
2. 恢復行程編輯、時長、手動交通與衝突提示，再補分組停車、租車、景點庫、收藏、費用及成員 UI。
3. 根據正式文件確認 Google 免費額度及專案邊界，恢復 Places／路程 consumer，重新設計 Steps 3–6；不把外連算成 API 功能完成。
4. 新增欄位逐項通過本機、雲端、備份及權限測試；最後重新做新手精靈與手機驗收。

本輪初始盤點沒有重跑完整驗收，沒有修改計費、登入原正式資料庫或發布正式版。

## 本輪第一項修復與證據

已在本修復分支加入 `src/providers/maps.js:dayRouteSections` 與「各群組今日路線」介面。此項只恢復原有免 Key 整日導航，不替代仍待恢復的 Places 或自動路程計算。

- 0／1／多群組、共有站點與專屬站點、重複返回同一地點均有測試。
- 11 站分成 5／5／3 站，各段重疊一個接續點，最多三個中途站；不把手機不支援的長路線塞進一個連結。
- URL 超長會縮短單段；兩站仍超限時顯示明確提示，不產生壞連結或靜默漏站。
- `npm run check`：73 項單元測試通過，production build 通過。未修改資料模型或 Rules，這不代表重新通過雲端端對端驗收。
- 實際內建瀏覽器：建立合成旅程、兩組、共同集合點與各組地點；A／B 路線正確分離，重整後保存；Enter 可展開路線面板。
- 390×844 視窗：內容寬及 scrollWidth 均為 375，沒有水平溢出；已還原視窗尺寸。
- 本機截圖僅含合成資料。正式版仍未發布，其餘對照表缺口維持未完成。

## 第二項修復：編輯、時間與衝突（2026-10-13）

- 時間線與下一站卡片可開啟編輯；保留項目 ID、備註、停車與航班欄位，可更換行程日期。刪除需再次確認，取消不改資料。
- 新增結束日期／時間、手動交通方式／分鐘，按群組提示一般行程重疊，包含跨日及先前較長安排。航班有自己的起降時區，不混入一般日曆時間計算；夏令時間切換的實際經過時長仍未實作。
- IndexedDB 使用單次 readwrite transaction 比對 revision，交易完成才回報成功；過期分頁不能覆蓋新資料。雲端沿用既有 revision transaction。
- 79 項單元測試及 build 通過。新測試包含備份／Firebase 序列化保留欄位、無效時間與交通輸入、原 ID 編輯、分組衝突、跨日與本機並行寫入。
- 真實本機瀏覽器：編輯後仍為 3 筆安排，沒有重複新增；跨午夜未選隔日會被拒絕，修正後顯示 60 分鐘；重整保留時間／備註／停車；刪除取消保留、確認刪除重整後減為 2 筆；下載完整備份再匯入恢復 3 筆及新欄位。
- 真實兩分頁：第一分頁更新成功，第二分頁被拒，未儲存草稿留在表單；重整證實第一筆修改沒有被覆蓋。390×844 視窗的內容寬及 scrollWidth 均為 375。
- 新時間欄位需新版 Rules。已新增 editor 可寫／viewer 不可寫、無效時間／交通欄位拒絕的 Emulator 測試；本機 Java 17 不符合 firebase-tools 的 Java 21 要求，改由 PR CI 執行。[GitHub CI #38410543055](https://github.com/chenzhu254/Travel-OS-first-run/actions/runs/38410543055) 已於本輪確認成功（程式 commit `e38a305`）：check、依賴稽核與 Rules Emulator 全部通過；尚未部署真實測試專案規則。
- Places、自動路程、分組停車、租車、收藏、景點庫、獨立費用及成員 UI 仍未完成；本輪未更改 Google 設定或計費方案。

## 正式專案整合（2026-10-15）

已將測試版經審查的行程編輯、分組導航、時間提示、航班顯示與 Firebase 首次建立／transaction 修復移入正式開源專案的 release-readiness 分支；沒有複製原私人網站或測試 Firebase 設定。正式 main 與 Pages 尚未變更。

本分支 npm ci 成功且依賴稽核為 0 vulnerabilities；79 項單元測試及 production build 通過。正式 PR 的 Rules CI 仍待執行，真實 Spark 雲端與完整新手驗收維持未完成。發布清單見 RELEASE_ACCEPTANCE.zh-TW.md。

## 第三項修復：分組停車（2026-10-15）

- 恢復共用／任意數量群組的主備停車、獨立地圖連結、步行分鐘、費用幣別與備註；下一站與時間線使用同一顯示邏輯。模式切換保留隱藏資料。
- 83 項單元測試及 production build 通過；依賴稽核 0 vulnerabilities。新增測試涵蓋三組、舊格式、備份與 Firebase 往返、數字群組 ID、分享副本及無效輸入。
- 實際本機瀏覽器建立兩組合成資料，保存不同幣別費用、主備停車與備註；重整仍存在，切換模式及再次編輯保留內容。地圖連結儲存與呈現已檢查，未將合成網址聲稱為真實導航驗證。
- 390×844 手機視窗：clientWidth／scrollWidth 同為 375；無水平溢出。截圖僅有合成資料，存於忽略追蹤的 private 目錄。
- 新增 Rules 欄位驗證及 editor／viewer 測試。已找到本機 Java 21，但 Emulator 啟動受到 Windows loopback 連線錯誤阻礙；正式 PR CI 尚待結果。真實 Spark 寫入、新版 Rules 發布與多人驗證尚未完成。
- 本輪不更改計費、Google 設定或正式站。景點庫、收藏、租車、費用、成員、Places 及自動路程仍依發布清單追蹤。
