## 繁體中文

版面回歸：旅伴登入改為桌面 540px 單欄，320／390px 實際瀏覽器無水平溢出；空白帳密顯示可修正錯誤。通用產物在根路徑與 repo 子路徑載入正常，跨年三日旅程重整讀回且路徑間不混資料；真實匿名資料庫讀取三項均為 401 拒絕。`ebc4dcd` CI 全部成功（178 項單元、40 項 Rules、build、稽核），88 個可達 commit 與通用產物的憑證／個資掃描無命中。真實旅伴登入與正式部署仍待驗，詳見 `docs/VERIFICATION_ONBOARDING_2026-11-05.zh-TW.md`。

2026-11-05 旅伴登入實作：建立者驗證後可匯出 allowlist 公開網站設定，透過 `TRAVEL_OS_SITE_CONFIG` Actions secret 部署。訪客載入同站執行時設定，只需網站 Email／密碼；禁止在設定檔帶入密碼、token、service account 或旅程資料。官方 demo 維持本機模式，錯誤設定不會改連瀏覽器記住的其他專案。另修復 CSS 優先序讓已隱藏的 Firebase 記住選項仍露出的問題。178 項單元與 production build 通過，preview 已確認簡化登入畫面；真實旅伴登入及正式 Pages 驗收仍待完成。操作文件：`docs/SITE_CONNECTION.zh-TW.md`。

現行部署模型：網站建立者管理一個 Firebase／Google 服務專案，受邀旅伴使用同一專案的 Authentication 帳號與旅程權限，不需各自建立專案。本次驗收沿用建立者現有 Blaze／免費試用專案，取消額外 Spark 流程與新增 Spark 測試帳號的門檻；下方較早紀錄中的 Spark 待辦已由此決定取代。README、設定精靈與指南同步澄清建立者／旅伴身分。

恢復通用旅程、原版四個主要介面、分組停車、景點收藏、航班、住宿、租車、多幣別費用、Firebase 成員權限與備份還原，以及選配 Google Places／Routes。Firebase Rules 依 UID、tripId 與 membership 隔離不可變完整旅程版本。

本輪修正 IANA／夏令時間時長與離線快取。production 建置產生內容版本識別，以部署 scope 隔離快取，並預先保存全部必要 JS／CSS。

驗證：172 項單元測試、production build、依賴稽核及 Rules Emulator 在 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41467832190) 全部通過。Chrome 實際停服重整、離線新增景點／備註／停車與恢復連線讀回成功。真實 Firebase owner 新旅程還原與重登讀回、Google Places 拒絕後手動保存均已實測。

尚待完成：連線設定的跨專案隔離、建立者首次部署、直接越權請求、正式 Pages 更新與離線重測。內建瀏覽器離線情境未通過，仍保留記錄。尚未宣告完整發布；詳細證據見發布驗收清單及驗證報告。

2026-11-03 增量：真實 owner 完成分組租車、住宿、取還車／入住退房加入行程，以及雙幣別費用保存／編輯與單筆暫存費用刪除；Firebase Console 直接核對伺服器快照。另從零建立獨立 Spark 專案，完成 Web app、Email／Password、RTDB 及成員隔離 Rules 發布，重載 Console 確認生效；新帳號與跨專案實測仍待完成。本機本輪 172 項單元、40 項 Rules 測試及 build 通過，正式依賴稽核 0 vulnerabilities。詳見 `docs/VERIFICATION_CLOUD_2026-11-03.zh-TW.md`。

2026-11-05：真實三帳號完成合成旅程分享、editor 編輯、viewer 唯讀介面、即時更新、舊表單衝突拒絕與草稿保留、成員撤銷／恢復，以及跨旅程清單隔離。另修正 config 非斷行空白解析、雲端空旅程副標與重新授權後殘留的同步錯誤提示。173 項單元與 build 通過；新版提示、獨立 Spark、直接越權請求及正式部署仍待驗。詳見 `docs/VERIFICATION_MULTIPLAYER_2026-11-05.zh-TW.md`。

## English

Layout regression: traveler login now uses a 540px single-column desktop dialog; real 320/390px browser checks show no horizontal overflow and blank credentials produce a recoverable error. Generic artifacts load at root and repository subpaths; a three-day cross-year local trip survives reload without leaking into the root scope. Three real anonymous database reads return 401. CI for `ebc4dcd` passes 178 unit tests, 40 Rules tests, build and audit. Credential/private-data scans of 88 reachable commits and generic artifacts find no matches. Real traveler login and production deployment remain pending; see `docs/VERIFICATION_ONBOARDING_2026-11-05.zh-TW.md`.

2026-11-05 traveler onboarding implementation: operators can export an allowlisted public website profile after verification and publish it through the `TRAVEL_OS_SITE_CONFIG` Actions secret. New visitors load same-origin runtime settings and see website Email/password login only; passwords, tokens, service accounts and trip data are rejected from the profile. The official demo remains local-only. Invalid deployed profiles fail closed instead of switching to a remembered project. Fixed a CSS specificity issue that exposed a hidden Firebase remember checkbox. 178 unit tests and production build pass; preview confirms the simplified UI, while real traveler login and deployed Pages acceptance remain pending. Setup instructions: `docs/SITE_CONNECTION.zh-TW.md`.

Current deployment model: the website operator manages a Firebase/Google services project. Invited travelers use Authentication accounts and trip roles within that project; they do not need separate projects. Acceptance uses the operator's existing Blaze/free-trial project. The additional Spark setup and Spark-user prerequisite are canceled, superseding older Spark TODOs below. README, wizard and guides now distinguish operator setup from traveler access.

Restore generic trips, the four original main views, grouped parking, saved places, flights, stays, rentals, currency-separated expenses, Firebase memberships and backups, plus optional Google Places/Routes. Firebase Rules isolate immutable complete-trip versions by UID, trip ID and membership.

This update fixes IANA/DST duration handling and offline caching. Production builds generate a content version, isolate caches by deployment scope, and precache required JS/CSS.

Validation: 172 unit tests, production build, dependency audit and Rules Emulator all pass in [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41467832190). Chrome passes reload with the server stopped, offline place/note/parking creation and readback after reconnect. Real Firebase owner restore/re-login and manual saving after a real Google Places rejection were verified.

Remaining gates: project-switch isolation, operator first deployment, direct unauthorized requests, and production Pages update/offline checks. The in-app browser offline case remains failed and documented. Full release readiness is not claimed; see the acceptance checklist and verification reports.

2026-11-03 update: a real owner saved grouped rentals, stays, pickup/return and check-in/out itinerary entries, plus currency-separated expenses, edits and deletion of one temporary test expense. Firebase Console confirmed server snapshots. A new independent Spark project now has a Web app, Email/Password, RTDB and published membership Rules, verified after a Console reload; new users and project-switch checks remain pending. This round passes 172 unit tests, 40 Rules tests and production build, with zero production dependency vulnerabilities. See `docs/VERIFICATION_CLOUD_2026-11-03.zh-TW.md`.

2026-11-05: three real accounts verified synthetic-trip sharing, editor writes, viewer read-only controls, live updates, stale-form rejection with drafts preserved, membership revocation/restoration and trip-list isolation. Fix non-breaking config whitespace, the cloud empty-state subtitle and a stale sync error after access is restored. 173 unit tests and build pass; new status wording, independent Spark, direct unauthorized requests and production deployment still require verification. See `docs/VERIFICATION_MULTIPLAYER_2026-11-05.zh-TW.md`.
