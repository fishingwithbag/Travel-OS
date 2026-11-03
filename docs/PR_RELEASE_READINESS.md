## 繁體中文

恢復通用旅程、原版四個主要介面、分組停車、景點收藏、航班、住宿、租車、多幣別費用、Firebase 成員權限與備份還原，以及選配 Google Places／Routes。Firebase Rules 依 UID、tripId 與 membership 隔離不可變完整旅程版本。

本輪修正 IANA／夏令時間時長與離線快取。production 建置產生內容版本識別，以部署 scope 隔離快取，並預先保存全部必要 JS／CSS。

驗證：172 項單元測試、production build、依賴稽核及 Rules Emulator 在 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41467832190) 全部通過。Chrome 實際停服重整、離線新增景點／備註／停車與恢復連線讀回成功。真實 Firebase owner 新旅程還原與重登讀回、Google Places 拒絕後手動保存均已實測。

尚待完成：第二個 Firebase Spark 專案切換、完整新手 Spark 流程、editor／viewer 真實多帳號、正式 Pages 更新與離線重測。內建瀏覽器離線情境未通過，仍保留記錄。尚未宣告完整發布；詳細證據見發布驗收清單及本輪部署報告。

2026-11-03 增量：真實 owner 完成分組租車、住宿、取還車／入住退房加入行程，以及雙幣別費用保存／編輯與單筆暫存費用刪除；Firebase Console 直接核對伺服器快照。另從零建立獨立 Spark 專案，完成 Web app、Email／Password、RTDB 及成員隔離 Rules 發布，重載 Console 確認生效；新帳號與跨專案實測仍待完成。本機本輪 172 項單元、40 項 Rules 測試及 build 通過，正式依賴稽核 0 vulnerabilities。詳見 `docs/VERIFICATION_CLOUD_2026-11-03.zh-TW.md`。

## English

Restore generic trips, the four original main views, grouped parking, saved places, flights, stays, rentals, currency-separated expenses, Firebase memberships and backups, plus optional Google Places/Routes. Firebase Rules isolate immutable complete-trip versions by UID, trip ID and membership.

This update fixes IANA/DST duration handling and offline caching. Production builds generate a content version, isolate caches by deployment scope, and precache required JS/CSS.

Validation: 172 unit tests, production build, dependency audit and Rules Emulator all pass in [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41467832190). Chrome passes reload with the server stopped, offline place/note/parking creation and readback after reconnect. Real Firebase owner restore/re-login and manual saving after a real Google Places rejection were verified.

Remaining gates: a second Firebase Spark project, complete first-run Spark setup, real editor/viewer accounts, and production Pages update/offline checks. The in-app browser offline case remains failed and documented. Full release readiness is not claimed; see the acceptance checklist and deployment report.

2026-11-03 update: a real owner saved grouped rentals, stays, pickup/return and check-in/out itinerary entries, plus currency-separated expenses, edits and deletion of one temporary test expense. Firebase Console confirmed server snapshots. A new independent Spark project now has a Web app, Email/Password, RTDB and published membership Rules, verified after a Console reload; new users and project-switch checks remain pending. This round passes 172 unit tests, 40 Rules tests and production build, with zero production dependency vulnerabilities. See `docs/VERIFICATION_CLOUD_2026-11-03.zh-TW.md`.
