# 雲端租車、住宿與費用驗收

驗證期間：2026-11-02 至 2026-11-03（Asia/Taipei）。候選分支：`feature/release-readiness`。

## 真實 Firebase owner 操作

測試專案為 `travel-os-first-run-test`。僅使用還原後的合成驗收旅程；未更改原作者正式專案。

- 租車：群組 A、跨年取還車日期、09:00／18:00、地點、分店、車型、合成預訂編號、備註與 TWD 1200 均保存成功。取車與還車分別帶入正確日期、時間及群組，並新增至每日行程。
- 住宿：群組 B、2026-12-31 至 2027-01-02、15:00／10:00、房型、2 人、合成預訂編號、備註與 USD 200 均保存成功。入住與退房均可帶入正確日期、時間及群組並新增至行程。
- 費用：新增 USD 100／3 人，畫面顯示每人 33.33、其中 1 人多付 0.01；修改備註後保存成功。另新增 TWD 300／2 人，顯示每人 150。摘要分開顯示 USD 100 與 TWD 300。
- 旅程隔離：切換至另一趟既有合成旅程，三類清單皆無本批資料；切回驗收旅程後，租車、住宿與費用內容保留。此操作只驗證同一帳號跨旅程，不替代跨專案驗收。

## 伺服器端證據

由已登入的 Firebase Console 讀取該驗收旅程，確認目前 `head` 為 10，`versions/10` 含 rentals、stays、expenses 及 items。直接進入各子節點，確認租車公司、合成預訂編號、住宿名稱、USD／TWD 金額及編輯後費用備註已保存於伺服器。

Console 長資料樹使用虛擬捲動，未出現在目前 DOM 的文字不能判為遺失；本次改以直接進入 rentals／stays 子路徑核對，兩類資料均存在。

## 邊界

初批未執行刪除；後續經帳號持有人明確確認後，完成下列單筆合成費用刪除。未改成員權限，亦未將目前顯示 Blaze／免費試用的環境誤記為 Spark。伺服器端讀回不替代第二帳號／第二裝置與新登入工作階段的測試。其餘操作仍依發布清單驗收。

## 費用刪除增量

取得明確確認後，只刪除新建的「可刪除驗收暫存費用」（TWD 1）。介面先顯示二次確認「確定刪除此筆獨立支出？每日安排的費用不受影響」，確認後顯示「獨立費用已刪除」與「已同步至自己的 Firebase」。摘要由 TWD 301 回到 TWD 300，USD 100 保留；原兩筆費用、租車、住宿與旅程保留。

另開 Firebase Console 直接核對：目前 head 為 12，`versions/12/expenses` 只包含原兩筆費用節點。這完成真實雲端單筆刪除驗收；新登入與多人刪除權限仍待驗。

## 獨立 Spark 新手設定增量

依 Firebase 官方 Web setup、Password Authentication 及 Realtime Database start 文件，從 Console 新建獨立專案 `travel-os-spark-acceptance`。畫面確認 Spark、每月 $0；未連結帳單，Gemini／Analytics 均未啟用。

- 註冊 Web app，未選擇 Hosting。
- 初始化 Authentication，僅啟用 Email／Password；電子郵件連結登入未啟用。
- 在新加坡建立 Realtime Database，採鎖定模式；未使用公開測試規則。
- owner／editor／viewer 建立畫面已準備，依瀏覽器操作規範，新密碼的輸入、確認及提交交由帳號持有人完成。
- CLI 已登入帳號與此新專案的 Console 帳號不同，CLI 部署被拒絕。改由 Console 準備候選版 Rules，取得帳號持有人「Spark Rules 發布確認」後按下發布。儲存完成後重新載入，成員隔離規則仍存在、「尚未發布的變更」及發布按鈕消失，確認已持久發布；方案仍為 Spark。此結果是部署驗證，不替代真實多帳號權限測試。
- 另以不含登入 token 的 REST 請求對新專案合成測試路徑執行 GET 與 PUT，兩者均回應 HTTP 401／`Permission denied`。未登入讀寫拒絕已在實際服務確認；這不替代有效 owner／editor／viewer 資料與越權測試。
- 本機部署目標已明確改為這個新測試專案，私人專案 denylist 保留，未向其他專案部署。
- 本輪另新增 TWD 1 合成暫存費用，經明確確認後刪除，介面與 Console 最新版本均核對成功，見上節。

官方來源：[Web setup](https://firebase.google.com/docs/web/setup)、[Password Authentication](https://firebase.google.com/docs/auth/web/password-auth)、[Realtime Database start](https://firebase.google.com/docs/database/web/start)。

## 本輪自動檢查

`npm run check`：28 個測試檔、172 項測試及 production build 成功。`npm audit --omit=dev --audit-level=high`：0 vulnerabilities。Rules 生成檔同步檢查成功。

Rules Emulator：2 個測試檔、40 項測試成功。起初預設 Java 17 不符合工具要求，切換已安裝的 Java 21 後又遇到 Windows NIO Unix-domain socket 初始化失敗。依 [OpenJDK PipeImpl 原始碼](https://github.com/openjdk/jdk21u/blob/master/src/java.base/windows/classes/sun/nio/ch/PipeImpl.java) 的 listener fallback 行為，在本次子程序指定不存在的 Unix socket 暫存目錄，使其使用 TCP loopback 後測試成功；未更改系統設定、產品程式或 Rules。

## 八項工作狀態

| 項目 | 本輪進度 | 尚待關閉 |
|---|---|---|
| 1. 分支與 CI | 04f5c71 的 [CI 全部通過](https://github.com/fishingwithbag/Travel-OS/actions/runs/41547630567)；本機 172 項單元、40 項 Rules 與 build 成功 | 後續提交繼續檢查 CI |
| 2. 部署、路徑、快取與離線 | 前批 Chrome production 根／子路徑驗證保留 | 正式 Pages 更新及線上重測；內建瀏覽器離線問題 |
| 3. Google 成功與降級 | 前批真實成功、無權限拒絕及手動保存證據保留 | 正式 Pages 與真實配額錯誤 |
| 4. 第二專案隔離 | 新建獨立 Spark，已發布成員隔離 Rules；原專案未修改 | 帳號登入、雙向切換讀回 |
| 5. Spark 新手設定 | 專案、Web app、Auth provider、RTDB 及 Rules 發布完成；production 子路徑精靈停在 Step 4 | 使用者、精靈登入、第一趟旅程與重登 |
| 6. 真實多人與衝突 | 單 owner 租車／住宿／費用雲端保存及 Console 讀回完成 | editor／viewer、越權拒絕、即時更新及競爭保存 |
| 7. 審查與文件 | 本輪報告及新手指南更新，未引入新依賴 | 最終 main／tag／產物掃描與 PR 同步 |
| 8. 發布 | 保留 draft PR，未將不完整驗收版本當成正式版 | 上述門檻完成後合併、Pages 實測與 release |

本表為實際進度，沒有將「環境準備完成」等同「八項驗收完成」。
