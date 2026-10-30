<p align="center">
  <img src="docs/assets/readme-hero.svg" width="100%" alt="Travel OS — 把旅程收進一張真正屬於你的地圖" />
</p>

<h1 align="center">Travel OS</h1>

<p align="center">
  <strong>行程可以很精彩，管理它不必很混亂。</strong><br />
  一個以使用者自有雲端同步為主軸、可自行部署、仍保有本機模式的開源旅遊規劃器。
</p>

<p align="center">
  <a href="https://github.com/fishingwithbag/Travel-OS/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/fishingwithbag/Travel-OS/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/fishingwithbag/Travel-OS/actions/workflows/pages.yml"><img alt="GitHub Pages" src="https://github.com/fishingwithbag/Travel-OS/actions/workflows/pages.yml/badge.svg" /></a>
  <a href="https://github.com/fishingwithbag/Travel-OS/releases"><img alt="Release" src="https://img.shields.io/github/v/release/fishingwithbag/Travel-OS?include_prereleases&sort=semver&style=flat-square&color=315d4c" /></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-cb8f5d?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://fishingwithbag.github.io/Travel-OS/"><strong>開啟本機體驗站</strong></a>
  ·
  <a href="docs/SELF_HOSTING.zh-TW.md"><strong>建立自己的網站</strong></a>
  ·
  <a href="docs/FIREBASE_SETUP.zh-TW.md"><strong>連接 Firebase</strong></a>
  ·
  <a href="docs/GOOGLE_CLOUD_SETUP.zh-TW.md"><strong>Google Maps 導航</strong></a>
</p>

> [!IMPORTANT]
> 官方公開體驗站只開放 **IndexedDB 本機模式**，不接受 Firebase config、Google API key、Email 或密碼。需要雲端同步時，請先用 **Use this template** 建立由自己控制的網站副本。

## 為什麼做 Travel OS？

> 開發狀態：正在恢復原站功能並執行完整新手驗收，目前尚未達到「陌生使用者可順暢使用所有功能」的發布標準。功能缺口見[發布驗收清單](docs/RELEASE_ACCEPTANCE.zh-TW.md)及[功能核對報告](docs/FEATURE_PARITY_AUDIT.zh-TW.md)。

一趟旅行散落在很多地方：日期留在日曆、航班躺在信箱、住宿埋在聊天紀錄，費用則分散在不同幣別。整理它們不該再需要另一個會綁住資料的平台。

Travel OS 把每天的安排、航班、住宿、同行群組與費用放回同一張旅程工作台。自行部署後，第一次啟動會先引導你連接自己的 Firebase；Google Maps 外部導航無需 API Key，站內搜尋與交通估算則可選填另一個 Google Cloud 專案的受限瀏覽器 Key。IndexedDB 保留給公開 Demo、離線與暫時不連雲端的情境。你決定資料放在哪裡，也可以隨時完整匯出帶走。

## 旅程需要的，都在同一個地方

| 規劃 | 資料 | 使用體驗 |
|---|---|---|
| 🗓️ 跨月、跨年動態日期 | ☁️ 使用者自有 Firebase 雲端同步 | 📱 手機與桌面響應式介面 |
| ✈️ 分開記錄起降日期與時區 | 💾 IndexedDB 本機 fallback | ⌨️ 鍵盤可操作的表單與對話框 |
| 🏨 景點、餐飲、住宿、交通與航班 | 🔐 owner／editor／viewer Rules | 🌙 明暗主題與離線 app shell |
| 👥 任意數量的同行群組 | 📦 私人備份與分享副本 | 🗺️ 無 API key 仍可開啟 Google Maps 外部導航 |
| 💱 不混加不同幣別 | 🔄 匯入前預覽與 schema 驗證 | 🧭 GitHub Pages 子路徑可部署 |

每日行程的「下一個安排」會直接顯示備註、主要與備用停車場，並分開提供目的地與停車場的 Google Maps 導航。新增安排時可貼上自己的 Google Maps 分享連結；不貼連結時會搜尋地址或名稱。

目前開發分支另已恢復旅程專屬的景點庫／收藏、分組租車、住宿預訂與獨立費用分攤，支援私人備份及分享副本。預訂可帶入每日安排；不同幣別分開計算，均分餘額明確列出。這批變更仍在 [PR #3](https://github.com/fishingwithbag/Travel-OS/pull/3) 驗收，正式體驗站尚未更新。

## 建議使用方式

### 1. 建立自己的雲端 Travel OS（主流程）

1. 登入 GitHub，在本 repository 按 **Use this template → Create a new repository**。
2. Owner 選自己的 GitHub 帳號；Repository name 建議填 `Travel-OS`。GitHub Free 請使用 **Public** repository。
3. 建立後進入自己的 repository → **Settings → Pages → Build and deployment → Source → GitHub Actions**。
4. 到 **Actions** 等待 Pages workflow 成功，再回 **Settings → Pages → Visit site** 開啟自己的網站。網址通常是 `https://你的帳號.github.io/Travel-OS/`。
5. 第一次開啟自己的 Travel OS，網站會自動進入分步設定精靈，依序完成 **網站確認 → Firebase → Google 地圖（選配站內功能）→ Firebase 登入 → 自動驗證 → 完成**。
6. 驗證完成後進入雲端模式，旅程儲存在自己的 Firebase。需要共用時，依[共用旅程指南](docs/COLLABORATION.zh-TW.md)為同一專案的獨立帳號授權；真實多人瀏覽器流程仍列入發布前驗收。

完整步驟請見[自行部署指南](docs/SELF_HOSTING.zh-TW.md)、[Firebase 設定指南](docs/FIREBASE_SETUP.zh-TW.md)與 [Google Maps 導航說明](docs/GOOGLE_CLOUD_SETUP.zh-TW.md)。設定精靈本身也會逐步告訴你要開哪個官方頁面、按哪裡、填什麼，以及哪些選項不要選。

### 2. 本機模式（Demo／離線／暫時略過雲端）

開啟[公開體驗站](https://fishingwithbag.github.io/Travel-OS/)，不用登入、不用 API key。旅程保存在目前瀏覽器的 IndexedDB。自行部署版本在設定精靈也可以明確選擇「先使用本機模式」。

> [!TIP]
> 本機瀏覽器資料可能被使用者自行清除；本機模式請定期下載完整備份。

## 資料怎麼流動？

```mermaid
flowchart LR
    A[旅行者的瀏覽器] -->|本機模式| B[(IndexedDB)]
    A -->|自行部署版本| C[自己的 Travel OS 網站]
    C -->|登入與同步| D[(自己的 Firebase)]
    A -->|免 Key 外部導航| E[Google Maps 網站]
    F[官方公開體驗站] -->|僅限本機模式| B
```

- 官方體驗站不開放雲端設定，避免使用者把憑證交給他人控制的前端。
- 自行部署版本把使用者自己的 Firebase 雲端同步當作 onboarding 主流程；本機模式是明確可選的 fallback。
- 「記住這台裝置」只保存公開 Firebase Web config，不保存密碼或登入狀態。
- Travel OS 拒絕 service account、Admin SDK 私鑰及 server secret。
- Firebase Rules 以 UID、`tripId` 和 membership 隔離資料。
- Google Maps 外部連結不需 Key；站內 Places 搜尋與 Routes 交通時間／距離已接回，但需要另一個已設定帳單的 Google Cloud 專案。不要把 Firebase Spark 專案拿去連結帳單。天氣已依產品決定移除。

更多細節請讀[資料與備份](docs/DATA_AND_BACKUPS.zh-TW.md)、[舊旅程升級與回復](docs/STORAGE_MIGRATION.zh-TW.md)、[安全政策](SECURITY.md)及[共享體驗站架構決策](docs/decisions/003-shared-demo-local-only.md)。

## 本機開發

需要 Node.js 22 或相容版本：

```bash
git clone https://github.com/fishingwithbag/Travel-OS.git
cd Travel-OS
npm ci
npm run dev
```

Production build 使用相對資源路徑，同一份輸出可放在網域根目錄或 repository 子路徑。

## 品質與安全檢查

```bash
# 單元測試與 production build
npm run check

# Firebase Realtime Database Rules；需要 Java 21
npm run test:rules

# 維護 Rules：修改 scripts/database-rules.mjs 後重新生成並確認同步
npm run firebase:rules:build
npm run firebase:rules:check

# 自架者部署 Rules：先明確核准自己的 Firebase project，再部署
npm run firebase:rules:configure -- --project YOUR_PROJECT_ID
npm run firebase:rules:deploy

# 已知套件漏洞
npm audit --audit-level=high
```

GitHub Actions 會在每次 push 與 Pull Request 執行上述檢查。Rules 測試涵蓋未登入者、陌生人、viewer、editor、owner、權限提升與跨使用者索引。

OpenSource repository 沒有 production Firebase target，也禁止從 Firebase 帳號中的既有專案自動推測部署目標。Database deploy 會經過 `predeploy` boundary guard；完整設計見 [ADR-004](docs/decisions/004-firebase-deployment-boundary.md)。

## 專案地圖

```text
src/
├─ config/       執行時設定解析與部署防呆
├─ domain/       旅程資料模型、驗證與備份
├─ providers/    Google Maps 外部導航、Places 與 Routes adapters
├─ storage/      IndexedDB 與 Firebase adapters
├─ ui/           租車、住宿與費用操作
├─ app.js        介面流程與狀態
└─ styles.css    響應式視覺系統

firebase/        自動生成的 Realtime Database Rules 部署檔
scripts/         Rules 結構來源、生成器與部署邊界工具
tests/           Domain、設定、儲存與權限測試
docs/            設定指南、資料說明與 ADR
```

## 目前狀態

Travel OS 仍在開發驗收階段，尚未達到完整發布標準。開發分支已恢復景點庫、收藏、租車、住宿、獨立費用、Places 搜尋、Routes 交通估算與多人協作；本機操作、備份、單元與 Rules 測試均有逐批紀錄。真實 Spark 全流程、真實 Google 服務、多帳號與正式 Pages 仍待完成驗收。天氣已移除。正式 Firebase 專案與 Rules 由每位自行部署者管理。

查看[版本紀錄](CHANGELOG.md)與 [Releases](https://github.com/fishingwithbag/Travel-OS/releases)了解每次更新。

## 一起把旅程工具做好

歡迎回報問題、改善文件或提出 Pull Request。提交前請閱讀[貢獻指南](CONTRIBUTING.md)，並確認示例不包含真實旅程、姓名、訂單、憑證或其他私人資料。

- [回報問題](https://github.com/fishingwithbag/Travel-OS/issues)
- [貢獻指南](CONTRIBUTING.md)
- [安全漏洞私密回報](SECURITY.md)
- [第三方授權與素材](THIRD_PARTY_NOTICES.md)

## License

Travel OS 採用 [MIT License](LICENSE)。你可以使用、修改及發布自己的版本；第三方套件仍依各自授權條款使用。

<p align="center">
  <sub>Plan freely. Keep your data. Travel your way.</sub>
</p>
