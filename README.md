<p align="center">
  <img src="docs/assets/readme-hero.svg" width="100%" alt="Travel OS — 把旅程收進一張真正屬於你的地圖" />
</p>

<h1 align="center">Travel OS</h1>

<p align="center">
  <strong>行程可以很精彩，管理它不必很混亂。</strong><br />
  一個 local-first、可自行部署、由旅行者擁有資料的開源旅遊規劃器。
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
</p>

> [!IMPORTANT]
> 官方公開體驗站只開放 **IndexedDB 本機模式**，不接受 Firebase config、Google API key、Email 或密碼。需要雲端同步時，請先用 **Use this template** 建立由自己控制的網站副本。

## 為什麼做 Travel OS？

一趟旅行散落在很多地方：日期留在日曆、航班躺在信箱、住宿埋在聊天紀錄，費用則分散在不同幣別。整理它們不該再需要另一個會綁住資料的平台。

Travel OS 把每天的安排、航班、住宿、同行群組與費用放回同一張旅程工作台。沒有帳號也能開始；需要跨裝置時，再連接自己擁有的 Firebase。你決定資料放在哪裡，也可以隨時完整匯出帶走。

## 旅程需要的，都在同一個地方

| 規劃 | 資料 | 使用體驗 |
|---|---|---|
| 🗓️ 跨月、跨年動態日期 | 💾 IndexedDB 本機優先 | 📱 手機與桌面響應式介面 |
| ✈️ 分開記錄起降日期與時區 | ☁️ 使用者自有 Firebase | ⌨️ 鍵盤可操作的表單與對話框 |
| 🏨 景點、餐飲、住宿、交通與航班 | 🔐 owner／editor／viewer Rules | 🌙 明暗主題與離線 app shell |
| 👥 任意數量的同行群組 | 📦 私人備份與分享副本 | 🗺️ 無 API key 也能開啟地圖 |
| 💱 不混加不同幣別 | 🔄 匯入前預覽與 schema 驗證 | 🧭 GitHub Pages 子路徑可部署 |

## 兩種使用方式

### 1. 先用本機模式出發

開啟[公開體驗站](https://fishingwithbag.github.io/Travel-OS/)，不用登入、不用 API key。旅程保存在目前瀏覽器的 IndexedDB，適合試用、單機規劃或不需要同步的旅行。

> [!TIP]
> 瀏覽器資料可能被使用者自行清除。正式使用時，請定期下載「完整備份」。

### 2. 建立自己的雲端版本

1. 按 repository 上方的 **Use this template** 建立個人副本。
2. 在副本的 **Settings → Pages** 選擇 **GitHub Actions**。
3. 開啟自己的 Travel OS，貼上自己的 Firebase Web config 並登入。

不需要修改程式碼，也不需要把 Firebase 設定提交到 Git。完整步驟請見[自行部署指南](docs/SELF_HOSTING.zh-TW.md)與 [Firebase 設定指南](docs/FIREBASE_SETUP.zh-TW.md)。

## 資料怎麼流動？

```mermaid
flowchart LR
    A[旅行者的瀏覽器] -->|本機模式| B[(IndexedDB)]
    A -->|自行部署版本| C[自己的 Travel OS 網站]
    C -->|登入與同步| D[(自己的 Firebase)]
    F[官方公開體驗站] -->|僅限本機模式| B
```

- 官方體驗站不開放雲端設定，避免使用者把憑證交給他人控制的前端。
- 自行部署版本只在使用者主動設定後連接指定的 Firebase。
- 「記住這台裝置」只保存公開 Firebase Web config，不保存密碼。
- Travel OS 拒絕 service account、Admin SDK 私鑰及 server secret。
- Firebase Rules 以 UID、`tripId` 和 membership 隔離資料。
- 目前地圖按鈕只開啟 keyless Google Maps URL；若未來加入 Maps JavaScript／Places，只能使用 Browser Key。Routes／Geocoding／Weather 的 Server Key 必須留在後端。

更多細節請讀[資料與備份](docs/DATA_AND_BACKUPS.zh-TW.md)、[安全政策](SECURITY.md)及[共享體驗站架構決策](docs/decisions/003-shared-demo-local-only.md)。

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
├─ providers/    外部地圖導覽
├─ storage/      IndexedDB 與 Firebase adapters
├─ app.js        介面流程與狀態
└─ styles.css    響應式視覺系統

firebase/        Realtime Database Rules
tests/           Domain、設定、儲存與權限測試
docs/            設定指南、資料說明與 ADR
```

## 目前狀態

Travel OS 正在公開 beta 階段。核心本機流程、備份、Firebase 權限及 Pages 部署已自動驗證；Google Places 等需要額外 API 或後端代理的能力尚未包含。正式 Firebase 專案仍由每位自行部署者管理 Authentication、Database、Rules、配額與帳務。

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
