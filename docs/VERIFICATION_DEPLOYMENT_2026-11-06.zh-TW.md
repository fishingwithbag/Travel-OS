# 新 Repo 與 Pages 部署驗收

日期：2026-11-06。這是獨立候選版部署，尚非原 repository 的正式發布。

## 實際部署

- 依使用者確認，在目前登入的 GitHub 帳號建立新的公開 [驗收 repository](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106)。未覆蓋原旅遊網站或變更原 Travel-OS 的 main／Pages。
- 透過 `Use this template` 建立，包含候選分支，將新 Repo 的預設分支設為 `feature/release-readiness`，Pages Source 選 `GitHub Actions`，手動執行既有部署流程。
- 候選分支為模板產生的新 commit `9fe32ea`，Git tree 與來源 `a6ba6ad` 完全一致：`8029b7c62690761bc20659da4c408770fa8a252f`。新 Repo 的 commit SHA 不同不代表程式版本不同。
- [Pages run 42184690684](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106/actions/runs/42184690684) 成功，178 項單元、40 項 Rules Emulator、建置與依賴安全稽核通過。
- [線上驗收網站](https://fishingwithbag.github.io/travel-os-onboarding-acceptance-20261106/) 實際開啟成功，HTML、JS、CSS、manifest 與 Service Worker 均回應 200，路徑位於新 Repo 子目錄。

建立模板時，舊 main 自動觸發的 CI 與 Pages 各失敗一次，兩者皆停在 `npm audit --audit-level=high`。本次沒有關閉安全稽核來掩蓋失敗；更新的候選分支通過同一門檻。正式發布前仍須將通過驗收的候選版合併至來源 main，才可讓一般新手依預設 main 部署，不要求一般使用者自行辨識開發分支。

Actions 對部分官方 Pages actions 顯示 Node 20 淘汰相容性警告，兩個 job 均成功；此為維護提醒，沒有當作測試失敗或忽略產品錯誤。

## 線上操作

首次開啟未發布網站設定檔的站點，正確呈現六步建立者精靈，沒有帶入作者旅程。確認自己的網址後進入 Firebase 步驟，接受完整 Web config 及 RTDB URL；Google 步驟保留外部導航與選配搜尋／估算，明確區分建立者與旅伴責任。已備妥既有測試設定，停在 Step 4 等帳號持有人輸入 owner 密碼。

另開分頁選擇本機模式，在正式 Pages 建立任意目的地、跨年三日旅程（2026-12-31 至 2027-01-02）。新增兩筆安排，下一站卡片直接顯示備註、Google Maps、主／備停車名稱與連結、步行 5 分鐘及停車備註。重新載入後資料與樣式保留，沒有要求展開編輯才看得到下一站資訊。零群組仍以所有人正常呈現。

輸入的 `<b>` 測試字串以文字呈現，未解析為 HTML；這是備註安全呈現的預期行為，不將任意匯入內容當作可執行標記。

繼續完成線上本機模式回歸：新增一個長名稱群組及第二群組；費用分別保存 USD 100 與 TWD 300，畫面分幣別列出，美元三人分攤為每人 33.33、其中一人多付 0.01。新增跨年 JFK → HND 航班，出發顯示 2026-12-31 23:30／America/New_York，抵達顯示 2027-01-02 05:30／Asia/Tokyo。

透過網站下載完整 JSON 備份，核對 `schemaVersion: 1`、private 模式、一趟旅程、兩群組、三筆安排及兩筆費用。再用網站匯入同一份合成備份，預覽正確辨識一趟旅程與三筆安排；確認還原後重整，兩群組、分幣別費用、分攤餘數、航班各自時區及下一站停車資料均讀回。只操作本輪新建的本機合成資料；備份檔保留。此為正式 Pages 的本機儲存驗收，不替代正式站雲端還原或從空白裝置還原的測試。

## 未完成項目

- 建立者在新站實際登入、本人範圍讀寫驗證與 Step 6 匯出。
- 將匯出的公開 allowlist profile 放入新 Repo 的 `TRAVEL_OS_SITE_CONFIG` Actions secret，再部署及確認新旅伴只需網站帳密。
- 正式站雲端資料操作、Google 來源限制與真實服務、更新快取及離線。
- 跨專案切換與實體裝置。既有本機／iframe 或其他分頁證據不冒充這些門檻。

第一輪部署未提供 `site-config.json`，該網址回應 404，屬未完成建立者發布設定的預期狀態；不能在這個階段宣稱旅伴簡化登入已完成線上驗收。

## 八項流程現況

本表更新歷史報告的待辦；第 5 項依使用者最新決定不再要求 Spark 或每位旅伴另建專案。

| 項目 | 現況與剩餘門檻 |
|---|---|
| 1 分支與 CI | 來源 `eb028be` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/42184926505) 通過；新 Repo 候選部署也通過 |
| 2 部署、路徑、快取與離線 | 新 Pages 子路徑、樣式、資料重整讀回通過；本機來源停服通過；正式 Pages 更新及完整離線仍待驗 |
| 3 Google 成功與降級 | 日本真實搜尋／估算與拒絕後手動保存通過；新 Pages 的受限 Key 來源與服務仍待驗，不實際耗盡額度 |
| 4 第二專案隔離 | 仍待具備第二專案登入後雙向切換；不將同專案三角色或兩趟旅程當作跨專案 |
| 5 建立者首次設定與旅伴登入 | 新 Repo 建立與部署通過；新網站已走到 Step 4，待本人輸入 owner 密碼後驗證、匯出設定、部署及旅伴登入 |
| 6 真實多人與衝突 | 同專案多人、舊表單拒絕及草稿保留通過；本日另完成 13 次直接 SDK 越權拒絕；跨裝置及正式站仍待驗 |
| 7 審查與文件 | 92 個可達 commits 與通用產物掃描無命中；另下載本次 Pages artifact，10 個檔案未命中憑證、個人 Email、本機使用者路徑或測試專案識別，未夾帶網站設定檔；最終 main／tag 仍須再掃描 |
| 8 合併及發布 | PR #3 保持 draft；前述門檻未全關閉，未合併來源 main 或建立正式 release |
