# 群組參照完整性：完整版本寫入驗證

狀態：Emulator 技術驗證通過，尚未整合至正式儲存介面。不是可部署的 Rules。

## 問題與驗證方法

目前 `/trips/{id}/data` 允許 owner/editor 更新。直接刪除群組時，未修改的行程與停車參照可能留下不存在的 groupId。既有恢復流程能保留資料，但不能取代伺服器完整性限制。

Firebase 的 `.validate` 不會對刪除資料執行；不能只在被刪除的群組放驗證條件。參考 [Firebase Rules 條件文件](https://firebase.google.com/docs/database/security/rules-conditions)。

`tests/snapshot-rules.test.js` 在獨立 Emulator namespace 驗證：

- metadata 保留 ownerId/members，資料改放在 `versions/{revision}`，head 指向現行版本。
- 每次發布到全新路徑，完整複用現有欄位與群組參照驗證；已發布版本不可局部修改。
- head 只能增加 1，必須與完整新版本原子寫入；拒絕過期、跳號及單獨寫入 head。
- 可在同一更新刪除舊版本，避免一般保存流程持續累積歷史；不可刪除現行版本。此實驗沒有強制歷史數量上限，惡意 editor 仍可保留歷史，儲存限制需另行評估。
- owner 不能繞過版本不可變條件，但仍能管理成員及刪除整趟旅程。

本方案只使用 RTDB Rules 與用戶端原子更新，不引入 Cloud Functions 或新的付費服務。這不代表已完成 Spark 真實雲端驗收。

## 實測證據

2026-10-20：8 個新測試通過，包括 owner/editor 局部刪除、孤立群組與分組停車、完整移轉及舊版清除、過期版本、建立時預埋版本、viewer/陌生人與撤權、整趟刪除。連同現有正式 Rules 測試共 33 個通過。

執行 `npm run test:rules`，CI 也會執行相同兩份測試。測試只使用 `demo-` 專案；`firebase.json` 仍指向原正式 Rules。

## 整合前必要工作

1. 儲存介面明確辨識舊資料與新格式；遷移只由 owner 執行，保留備份，處理已存在的孤立參照，不靜默捨棄。
2. 同步調整建立／保存／訂閱／權限／刪除及設定精靈的 Rules 檢查。舊版用戶端遇到新資料時須提示更新，不得建立空白旅程覆寫。
3. 驗證兩個真實 SDK 用戶端競爭保存、撤權、斷線重連、revision 衝突，以及切換專案清除訂閱。
4. 原子發布只保留所需版本；量測大型旅程下載量與 Spark 額度，評估惡意保留歷史的限制。
5. 遷移／回復／完整備份還原測試及瀏覽器驗收完成，才能更新正式 Rules 與使用說明。

## Windows Emulator 啟動紀錄

本機 Java 21 出現 `PipeImpl / UnixDomainSockets / Invalid argument: connect`。指定一個短、可寫且非虛擬化的 socket 暫存路徑後成功啟動；不需要修改防火牆或雲端專案。

Java 參數為 `-Djdk.net.unixdomain.tmpdir=<本機短路徑>`；路徑須先存在，不能把此環境專用值提交為共用設定。參考 [Oracle Java Networking](https://docs.oracle.com/en/java/javase/21/core/java-networking.html) 的 UNIX domain socket properties。
