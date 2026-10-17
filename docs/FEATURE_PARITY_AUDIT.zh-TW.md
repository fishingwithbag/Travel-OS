# 原站功能與開源版差異核對

核對日期：2026-10-12。這是程式盤點與修復清單，不是完整驗收通過證明。

下表記錄初始盤點；後續已恢復項目及驗證結果列在文末，最新追加日期為 2026-10-16。

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

### Rules 邊界修正（2026-10-16）

第一次正式分支 CI 揭露測試錯把 RTDB 的局部更新當成整份資料驗證：刪除 groups 不會觸發未變動 items 下的停車 .validate。現已將關聯驗證案例改用網站 adapter 實際採用的整份 data 寫入邊界；未知群組的新增停車、非法金額與 viewer 寫入仍須被拒。

**剩餘限制**：有編輯權限的人若繞過網站、直接局部刪除群組，仍可能留下舊停車或行程的失效關聯。這是資料一致性缺口，不是完整安全保證；目前尚無刪除群組 UI，發布前須在群組編輯／移除流程一併處理並驗證。不要將本輪 CI 成功聲稱為所有任意局部寫入均維持參照完整性。

### 本批驗證結案（2026-10-16）

程式版本 `eb308d7` 的 [GitHub CI #38765543790](https://github.com/fishingwithbag/Travel-OS/actions/runs/38765543790) 成功：83 項單元測試、17 項 Rules Emulator 測試、production build 及依賴稽核全部通過。這取代前述「待 CI」狀態；本機 Emulator 啟動限制與直接局部刪除群組的一致性缺口仍如實保留。

另在實際瀏覽器下載完整備份，於另一個尚無旅程的本機 origin 匯入，預覽顯示 1 趟／1 筆安排；確認後重整，A／B 組、主要／備用停車、步行 5 分鐘、USD 12.50、JPY 300.00 及入口備註均保留。這是本機還原測試，並未替代真實 Firebase 備份還原驗證。

下一批依 A08／A09 恢復景點庫與收藏，再續租車、住宿、獨立費用、成員與即時同步、Google Places／自動路程及設定精靈。正式 main、Pages 與真實 Rules 未部署；目前不宣告已達完整公開使用標準。

## 景點庫與收藏恢復（2026-10-16）

- 比對原網站的地區、類別、子類別、營業時間、備註與收藏操作，恢復旅程專屬景點庫；支援自訂分類、組合搜尋、排序、收藏及取消收藏。
- 景點可帶入每日安排表單，另選日期／時間／群組及停車。已排入行程的內容是獨立副本；修改或刪除景點庫資料不會改掉安排。過長的合併備註須由使用者縮短，不靜默裁切。
- 舊 schemaVersion 1 沒有 places 時視為空景點庫。私人備份保留完整景點／收藏；分享副本移除整個候選景點庫。匯入預覽新增景點數量。
- 實際瀏覽器：新增餐廳、地區／分類／子類別／營業時間與備註；組合搜尋及收藏篩選；取消收藏後清單變空；加入行程後修改景點，原安排仍保留。重整後景點與收藏可讀回。
- 實際下載備份並匯入另一個原本空白的本機 origin。測試揭露既有匯入完成流程在 await 後使用 event.currentTarget，資料雖已保存卻顯示失敗；已保存 form 參照並防止重複確認。修正後重測顯示「已還原 1 趟旅程」，視窗關閉，重整後景點、收藏及安排保留。
- 第二趟旅程顯示 0 個景點／0 個收藏，切回第一趟顯示 1／1。390×844 手機內容寬與 scrollWidth 均為 375，無水平溢出；Tab 可由備註到收藏控制項。
- 新增景點 domain／備份／IndexedDB／Firebase 序列化測試，以及 Rules 的 editor 修改、viewer 拒寫、陌生人拒讀與非法欄位拒絕案例。89 項單元測試及 build 已通過；Rules Emulator 等待本批 GitHub CI 驗證。
- 新 places 欄位需要新版 Rules；尚未寫入真實 Firebase 或更新正式 Pages。Google Places 真實搜尋與自動交通仍待恢復，不能將本輪手動景點庫聲稱為 API 功能完成。

下一批：各群組租車與取還車安排、住宿預訂、獨立費用，接續多人協作、Google 功能及精靈。發布門檻仍未通過。

景點庫程式版本 `f35f70b` 的 [CI #38824635547](https://github.com/fishingwithbag/Travel-OS/actions/runs/38824635547) 已通過，包含 89 項單元測試、18 項 Rules Emulator 測試、build 與依賴稽核。實際瀏覽器也補測刪除取消保留資料，確認刪除後重整，景點數為 0、原每日安排仍為 1。

## 分組租車恢復（2026-10-16）

- 依原網站租車欄位恢復公司、分店、車型、取還車日期／時間／地點、各自地圖、預訂編號、備註、費用及幣別；任意群組可有多筆預訂，0 群組可選所有人共用。
- 取還車可分別加入每日行程表單，帶入日期、時間、地址、群組與預訂備註。安排為獨立副本，預訂費用不會自動重複計入行程；之後獨立費用功能另行記帳。更動或刪除預訂不會暗中改掉每日安排。
- 驗證日期在旅程內、還車不可早於取車、合法 Maps 連結及有效費用／幣別。舊 v1 備份沒有 rentals 時為空；私人備份與 Firebase 保留，分享副本移除預訂資料。
- 94 項單元測試及 build 通過，包含跨年取還車、0／多群組、過期群組、不合法日期／時間、備份與 Firebase round-trip。新增租車 Rules 欄位驗證、viewer 拒寫與未知群組拒絕案例；等待本批 CI。
- 真實瀏覽器建立示例 A 組租車、USD 120.50、合成預訂編號及備註；取車與還車分別帶入 1/1 09:00 與 1/2 18:00，群組與備註正確。重整後 3 筆安排與租車資料仍在，費用摘要未重複加入預訂費用。
- 編輯租車將還車改為早於取車，畫面拒絕並保留輸入；修正後可保存。下載備份、於另一個本機 origin 還原並重整，租車完整保留。390×844 實際內容寬與 scrollWidth 均為 375；手機控制項可操作。
- 原站資料／規則與計費未動。新 rentals 欄位需隨新版 Rules 發布；真實 Spark 及多人仍待驗證。接續住宿預訂、獨立費用與其餘發布門檻。

租車版本 `f7c248d` 的 [CI #38825124421](https://github.com/fishingwithbag/Travel-OS/actions/runs/38825124421) 已通過：94 項單元、19 項 Rules Emulator、build 及依賴稽核。

## 住宿預訂恢復（2026-10-16）

- 新增旅程專屬住宿預訂，包含名稱、地址／地圖、群組、房型、人數、預訂編號、備註、各自入住／退房日期時間與獨立幣別費用。兩個事件可各自帶入每日行程，費用不重複加入摘要。
- 驗證日期／時間依序、旅程範圍、有效人數與群組；私人備份保留預訂，分享副本移除，舊 v1 缺少 stays 時仍可匯入。
- 97 項單元測試與 build 通過。新增住宿 Rules 的日期、人數、群組、金額與 viewer 拒寫測試，等待本批 CI。
- 真實瀏覽器：儲存合成旅館、雙床房、2 人、EUR 180.50、合成預訂編號與晚到提醒；加入 1/1 15:00 入住與 1/2 11:00 退房，重整仍在。退房早於入住會明確拒絕且保留表單。
- 下載完整備份至另一 origin 還原、重整後住宿仍在；390×844 內容寬與 scrollWidth 皆為 375。刪除預訂後住宿清單為 0，5 筆原安排仍保留。
- 真實 Firebase 與正式站尚待驗，新 stays 欄位需要新版 Rules。下一批恢復獨立費用 CRUD 與人數分攤。

## 獨立費用與分攤恢復（2026-10-16）

- 獨立費用可新增、編輯、確認刪除，包含日期、分類、群組、金額、幣別、付款人、備註與分攤人數。旅程摘要加總每日安排與獨立支出，不混加不同幣別。
- 以整數金額均分；USD 10.00／3 人顯示每人 3.33、其中 1 人多付 0.01；USD 12.50／3 人顯示 4.16、其中 2 人多付 0.01。租車／住宿預訂費用不自動變成實際支出，畫面提醒避免重複記帳。
- 101 項單元測試及 build 通過。測試涵蓋 0／極小金額、1／3／7／1000 人、餘額恆等式、不同幣別、無效日期／金額／人數／群組、私人／分享備份及 Firebase round-trip。新增 Rules 金額、人數、viewer 寫入及非法欄位案例，等待本批 CI。
- 真實瀏覽器：新增 USD 10.00 晚餐、3 人分攤、付款人及備註，再新增 EUR 20.00 車票；摘要分開顯示。修改晚餐為 USD 12.50，下載備份至另一 origin 還原、重整後兩幣別金額與分攤保留。
- 刪除取消仍保留 USD 12.50／EUR 20.00；確認刪除晚餐並重整後只剩 EUR 20.00。390×844 內容寬與 scrollWidth 皆為 375，無水平溢出。測試均使用合成資料。
- 新 expenses 欄位需新版 Rules；真實 Spark、多裝置與正式發布仍待驗。A08–A12 本機功能已恢復，下一階段處理成員／即時同步、Google API 與精靈、雲端還原及完整發布驗收。

## 雲端逐趟還原（2026-10-16）

- 雲端登入後也可預覽 JSON 備份，從下拉選擇一趟「匯入為新的雲端旅程」。產生新 ID、revision 1 與新的時間戳記；保留旅程內容，原有旅程不覆蓋，來源 membership／未知欄位不會匯入。
- 保存期間停用控制項並防止 Esc／背景關閉或重複提交；失敗留在預覽內顯示錯誤，可修正連線或 Rules 後再試。
- 102 項單元及 build 通過，adapter 測試確認只寫新的 trips／userTrips 路徑並建立目前帳號的 owner membership，不觸碰原 ID。新增 Emulator 案例覆蓋景點、租車、住宿、費用一起還原以及未受邀者不能讀取；本批 CI 待確認。
- 本機匯入流程回歸：實際瀏覽器匯入完整備份後視窗關閉並顯示成功，無 console error。真實雲端逐趟還原尚未操作，不以 mock 或 Emulator 替代真實 Spark 驗收。

### 本輪 CI 與上傳紀錄（2026-10-16）

- 住宿版本 `6016776`：[CI #38825450206](https://github.com/fishingwithbag/Travel-OS/actions/runs/38825450206) 通過。
- 費用版本 `f008e1d`：[CI #38825776481](https://github.com/fishingwithbag/Travel-OS/actions/runs/38825776481) 通過。
- 最新程式版本 `532dffa`：[CI #38826104337](https://github.com/fishingwithbag/Travel-OS/actions/runs/38826104337) 通過，包含 102 項單元、22 項 Rules Emulator、production build 與依賴稽核。這取代前述這幾批的「等待 CI」狀態。
- 逐批審查 staged 檔案與 diff，掃描本批變更的服務憑證、測試專案識別與私人本機路徑後提交；沒有新增外部套件。這是本批掃描，不代替發布前完整 Git 歷史與建置物掃描。
- 全部推送至 `feature/release-readiness`，更新 [PR #3](https://github.com/fishingwithbag/Travel-OS/pull/3) 的繁體中文／英文標題與說明。main、正式 Pages、真實 Firebase Rules 與計費未變更。
- 發布阻擋項仍包括 Google Places／自動交通、成員邀請與即時同步、後續精靈、群組移除一致性、真實 Spark／多人／正式站全流程，以及最終私人資訊與授權檢查。

## 成員與即時同步（2026-10-17）

- 依 [Firebase 官方讀寫文件](https://firebase.google.com/docs/database/web/read-and-write) 使用 `onValue`：僅訂閱本人索引與索引內旅程，不訂閱整個資料庫。動態加入／移除旅程，斷線顯示具體狀態，登出／切換專案停止全部訂閱及排隊中的舊回呼。
- 顯示目前專案帳號 UID；擁有者可貼上同一專案使用者 UID，新增／修改 editor 或 viewer，移除需第二次確認。這是直接授權，不寄邀請信，也不假裝能在瀏覽器驗證另一 UID 是否已在 Auth 註冊；受邀者須先有同專案帳號並登入取得 UID。
- 原 owner 不可降權、移除或另授第二個 owner。Rules 以原 ownerId 管理成員；editor 不可升權、viewer 不可寫入。介面停用 viewer 的修改入口，真正權限仍由 Rules 執行。
- 更新到來時保留開啟中的草稿，版本比對拒絕舊資料覆蓋；撤權後移除已載入旅程，草稿仍可複製。切換專案清除表單與 access 快取，舊連線的晚到寫入結果不載入新專案。
- 108 項單元與 build 通過，包括索引變更、撤權、壞資料隔離、unsubscribe／晚到回呼、斷線寫入拒絕、成員路徑／owner 保護與切換期間寫入。
- 新增實際 Firebase SDK 的多身分 Emulator 流程：editor 修改即時送到 viewer，viewer 拒寫、owner 調權、受邀者索引自動出現、撤權後拒讀、登出後不再接收事件。等待 CI 執行；這不是已完成真實帳密或瀏覽器雲端驗收。
- 正式 Pages、真實 Firebase Rules 與計費未變更。Google 功能／精靈、群組移除一致性與完整真實 Spark 發布驗收仍未完成。

### 即時同步 CI 結果（2026-10-17）

第一輪 CI 的 22 項既有 Rules 案例通過，新 SDK 流程在第一次修改時因測試資料的 createdAt 設為未來而被時間戳記驗證拒絕。已將該流程的建立時間改為測試實際時間；旅遊日期仍可在未來。

程式／測試版本 `47a73a7` 的 [CI #38999559912](https://github.com/fishingwithbag/Travel-OS/actions/runs/38999559912) 成功：108 項單元、23 項 Rules／SDK Emulator 案例、production build 與依賴稽核全部通過。多 SDK 測試的 Auth 身分由 Emulator context 提供，沒有操作真實帳號登入。

實際本機瀏覽器回歸：新建旅程與示例安排、保存備註、重整讀回，雲端帳號區在本機模式隱藏，沒有 console error。新增[共用旅程指南](COLLABORATION.zh-TW.md)，說明既有 Firebase 專案、各自帳號、UID 直接授權與角色。仍未宣告真實 Spark 或雲端瀏覽器已通過。

### Google 恢復工作的官方依據（2026-10-17）

- [Place Autocomplete Widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)：現行介面為 `PlaceAutocompleteElement`、`gmp-select` 與 `place.fetchFields()`。搜尋、地址與座標仍要恢復，不能以外部 Maps URL 代替。
- [Maps JavaScript Routes](https://developers.google.com/maps/documentation/javascript/routes/get-a-route) 及 [Route reference](https://developers.google.com/maps/documentation/javascript/reference/route)：有可於瀏覽器使用的 `Route.computeRoutes()`，可請求 `distanceMeters`／`durationMillis`。恢復自動交通時應先評估這個官方瀏覽器介面，不直接假設必須新增 Firebase Functions 或改 Blaze。
- [Places 資料政策](https://developers.google.com/maps/documentation/places/web-service/policies)：place ID 可長期保存，其餘 Google 回應內容有快取與署名限制。實作需區別使用者手動資料與 API 回應，不能照搬原站的永久快取方式。
- [Google 價格總覽](https://developers.google.com/maps/billing-and-pricing/overview) 與 [額度變更 FAQ](https://developers.google.com/maps/billing-and-pricing/faq)：免費額度依 SKU；設定指南應逐項核實所用 API／欄位與 quota。Firebase Spark 與 Google Maps 計費條件分別說明，不擅自更改使用者方案、不宣稱所有用量永遠免費，也不因計費前提刪除所需功能。

上述是下一批實作依據，A13／A14 仍未完成；本批沒有啟用 Google API、輸入 Key 或送出計費操作。天氣維持移除。
