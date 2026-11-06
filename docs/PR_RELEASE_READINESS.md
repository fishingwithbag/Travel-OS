## 繁體中文

將原旅遊網站整理為通用 Travel OS，保留四個主要畫面、每日行程與下一站資訊、景點、分組停車、手動航班、住宿、租車、分幣別費用及備份。目的地、日期與群組改由旅程資料決定，移除作者預設資料與服務設定；天氣依產品決定移除。

網站建立者完成六步精靈、驗證 Firebase 連線，再匯出公開 allowlist profile，透過自己的 `TRAVEL_OS_SITE_CONFIG` Actions secret 部署。受邀旅伴只輸入網站帳密，不需 Firebase Console、個人專案或 API Key。Firebase Rules 依 UID、tripId 及 membership 保護不可變完整版本；Google Places／Routes 選配，失敗時保留草稿並提供手動操作。修正跨時區／DST 時長、快取、長群組按鈕與 Google 元件主題。

已驗證：

- 最新來源 `6e1efc3` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/42185899331) 通過 178 項單元、40 項 Rules、build 與稽核。
- 真實 Firebase 三角色 21 PASS／0 FAIL，包含 13 次直接越權拒絕；editor 合法發布、viewer 讀回新版及角色完整性通過。
- 真實日本 Places、開車／步行及三群組 Routes、手動優先、缺 Key 與來源拒絕後資料保留通過。390px iframe 鍵盤、深淺色及本機來源停服重整通過。
- [獨立新 Repo](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106) 的 [Pages 部署](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106/actions/runs/42184690684) 通過；線上本機模式完成跨年旅程、下一站備註／Maps／主備停車、多群組、雙幣別分攤、跨時區航班與 JSON 還原後重整讀回。
- 92 個可達 commits、通用產物與本次 Pages artifact 的指定憑證／個資模式掃描無命中。新 Repo 模板 tree 與 `a6ba6ad` 一致；沒有覆蓋原站或來源 main。

仍保留 draft：新 Pages 建立者登入／匯出 profile／部署後旅伴登入、正式站 Google／更新離線、第二專案雙向切換及跨裝置仍須驗收。不能把 CI、390px iframe 或來源停服等同全部發布門檻。新 Repo 建立時舊 main 的兩次流程失敗在安全稽核，最新候選分支通過同一門檻，沒有關閉稽核。

證據與現行門檻：`docs/RELEASE_ACCEPTANCE.zh-TW.md`、`docs/VERIFICATION_AUTHORIZATION_2026-11-06.zh-TW.md`、`docs/VERIFICATION_DEPLOYMENT_2026-11-06.zh-TW.md`、`docs/VERIFICATION_GOOGLE_2026-11-06.zh-TW.md`。網站發布設定見 `docs/SITE_CONNECTION.zh-TW.md`。

## English

Generalize the original travel site while retaining its four main views, itinerary/next-stop details, places, grouped parking, manual flights, stays, rentals, currency-separated expenses and backups. Destinations, dates and groups come from trip data; author-specific data and service defaults are removed. Weather is removed by product decision.

Operators complete the six-step wizard, verify Firebase and export an allowlisted public website profile through their own `TRAVEL_OS_SITE_CONFIG` Actions secret. Invited travelers enter website credentials only, without Console access, separate projects or personal API keys. Firebase Rules protect immutable complete-trip versions by UID, trip ID and membership. Optional Google Places/Routes preserve drafts and manual alternatives on failure. Fix timezone/DST durations, caching, long group controls and Google component themes.

Validation:

- Source `6e1efc3` [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/42185899331) passes 178 unit tests, 40 Rules tests, build and audit.
- Real Firebase: 21 PASS, zero failures, including 13 rejected direct unauthorized operations; valid editor publication, viewer readback and role integrity pass.
- Real Japanese Places, driving/walking and three-group Routes, manual priority, missing-key and rejected-origin recovery pass. A 390px browser iframe passes keyboard/theme checks; local-origin-down reload passes.
- A [new independent repository](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106) [deploys successfully](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106/actions/runs/42184690684). Its live Pages local mode passes cross-year trips, visible next-stop notes/maps/parking, multiple groups, currency-separated splitting, timezone-specific flights and JSON restoration/readback.
- Targeted credential/private-data scans pass across 92 reachable commits, generic artifacts and the deployed Pages artifact. The template tree matches `a6ba6ad`; original-site and source-main deployments are unchanged.

Keep this PR draft: hosted operator sign-in/profile export/traveler sign-in, hosted Google/update/offline checks, project-switch isolation and cross-device acceptance remain open. CI, a responsive iframe and a stopped local origin do not establish full release readiness. Initial template-main runs failed the dependency audit; the current candidate passes the same gate without disabling it.

Evidence: `docs/RELEASE_ACCEPTANCE.zh-TW.md` and the authorization, deployment and Google verification reports dated 2026-11-06. Operator publishing instructions: `docs/SITE_CONNECTION.zh-TW.md`.
