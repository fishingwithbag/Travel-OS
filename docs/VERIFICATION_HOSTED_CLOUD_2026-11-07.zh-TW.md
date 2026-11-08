# Pages 建立者設定與旅伴雲端驗收

日期：2026-11-07（Asia/Taipei）。網站為[獨立驗收 Pages](https://fishingwithbag.github.io/travel-os-onboarding-acceptance-20261106/)，不是原旅遊網站；候選程式仍與 `a6ba6ad` 相同。本輪未升級帳戶或修改計費方案。

## 建立者只設定一次

1. 建立者在新 Pages 的 Step 4 輸入既有密碼，Step 5 實際通過 Authentication、本人 UID 範圍 RTDB 診斷及目前儲存格式的合法 Rules 檢查。
2. Step 6 顯示雲端已連線，透過產品按鈕下載 `site-config.json`；檔案只含 `schemaVersion` 與公開 Firebase Web config，沒有密碼、Token 或管理憑證。
3. 在新驗收 Repo 的 GitHub 介面新增 `TRAVEL_OS_SITE_CONFIG` Actions secret，貼上產品匯出的 JSON，手動重新部署候選分支。
4. [Pages run 42249443894](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106/actions/runs/42249443894) 成功；下載的 artifact 確認包含 `site-config.json`，建置記錄有設定驗證成功訊息。
5. 新分頁實際開啟後，直接呈現「登入 Travel OS」與網站 Email／密碼，沒有 Firebase config、Google Key 或六步建立者設定要求。

命令列 HTTP 檢查曾取得 404，但瀏覽器新分頁已實際載入設定並成功登入，與產物內容一致。不能將該次外部 HTTP 結果誤報成瀏覽器部署失敗，也不能只憑 Actions 綠燈宣稱介面已驗收。

## 旅伴網站登入與角色隔離

帳號持有人只在網站輸入既有 viewer 密碼，畫面顯示「已登入網站」，讀回兩趟已分享的合成旅程。原驗收旅程的下一站租車備註、Maps、停車與 USD／TWD 分列費用正確，群組及成員修改停用；沒有其他帳號的私有旅程。

同一帳號透過網站建立新的三日跨年旅程，成功成為**自己新旅程的 owner**；切回他人分享的旅程仍為 viewer。這是按旅程授權，不是帳號全域升權；旅伴全程不需 GitHub、Firebase Console 或 Google Cloud 管理資格。

## 新旅程的真實雲端操作

- 建立兩群組；分別保存 A 組住宿與 B 組租車，跨年入住／退房、取車／還車日期與時間正確。
- 住宿入住、租車取車經產品按鈕加入每日安排。
- 新增共用下一站，保存備註、目的地 Maps、主要／備用停車與步行 5 分鐘；B 組下一站卡片直接顯示完整內容，不需展開編輯。
- 保存 USD 100 與 TWD 300，畫面分幣別列出，美元三人分攤為每人 33.33、其中一人多付 0.01。
- 網站下載的完整備份包含三趟可讀旅程；本輪自建旅程具有兩群組、三筆安排、一筆住宿、一筆租車與兩筆費用。
- 在網站匯入此備份，預覽正確辨識三趟、十筆安排；只選本輪自建旅程，還原成新的雲端旅程。原旅程保留，清單新增第四趟，還原後 B 組取車、下一站備註及主備停車正確。
- 另下載分享副本，確認 `mode: share`，本輪兩份旅程均保留安排，移除安排備註、預訂備註及獨立費用；沒有把私人完整備份當作分享副本。

所有新增資料皆為本輪合成驗收內容，未修改原作者正式旅程。第一次住宿提交因未填必要時間而由原生表單阻止；補齊入住／退房時間後成功，沒有錯誤成功提示。

## 尚待完成

- 2026-11-08 更新：帳號持有人已同意新增新 Pages 來源及發布 Browser Key，重新開啟 Cloud Console 確認新來源已保存，三項 API 限制保留。含 Key 的 profile 已填入新驗收 Repo 更新表單，但 GitHub 要求再次確認身分，尚待本人完成 Verify／Update secret；尚未宣稱 Key 已部署或正式站 Google 通過。
- 新 Pages 新增／還原的旅程仍須另一次登入或獨立裝置讀回；本輪未將同分頁切換或匯出誤報成跨裝置重登。
- 第二專案雙向切換、完整正式站更新／離線及實體裝置仍保留門檻。
- 來源 PR 仍為 draft，未合併 main 或建立正式 release；不能宣稱整體 100% 發布完成。

瀏覽器截圖及完整備份留在本機，不將 Email、UID、實際專案設定或私人備份上傳到來源 repository。正式服務端拒絕證據另見[三角色權限報告](VERIFICATION_AUTHORIZATION_2026-11-06.zh-TW.md)。

後續分組停車實測發現選 B 組仍顯示 A 組資訊，已修正並部署，詳見[2026-11-08 回歸報告](VERIFICATION_PARKING_2026-11-08.zh-TW.md)。
