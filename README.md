# Travel OS

Travel OS 是一個 local-first 的開源旅遊規劃器。第一次開啟即可在本機建立旅程。需要跨裝置同步時，先把 Travel OS 部署到自己控制的網站，再於設定精靈貼上自己的 Firebase Web config。Google Maps browser key 是選配，未設定時仍可透過一般地圖連結導航。

## 功能

- 自訂目的地、跨月／跨年日期與多個旅程。
- 景點、餐飲、住宿、交通、手動航班與任意數量同行群組。
- 航班出發／抵達時區與日期分開記錄。
- 不混加不同幣別的費用摘要。
- IndexedDB 本機模式，以及使用者自有 Firebase 的雲端模式。
- 完整私人備份、去除備註／群組／金額的分享副本、匯入預覽。
- 相對路徑建置，可部署在網域根目錄或 GitHub Pages repository 子路徑。
- 離線 app shell、鍵盤操作、桌面與手機響應式介面。

## 立即使用

直接開啟 [Travel OS 公開體驗站](https://fishingwithbag.github.io/Travel-OS/) 使用本機模式，或在本機啟動：

```bash
npm ci
npm run dev
```

本機模式不需帳號或 API key，資料只存在目前瀏覽器。公開體驗站會停用 Firebase、Google key 與帳密輸入，避免使用者將雲端憑證交給他人維護的前端。需要同步時，依 [自行部署指南](docs/SELF_HOSTING.zh-TW.md) 建立自己的網站副本，再依 [Firebase 設定指南](docs/FIREBASE_SETUP.zh-TW.md) 完成連線。

Web config 是 Firebase 用戶端連線資料，並不是管理員密鑰；真正的資料隔離由 Authentication 與 Database Rules 執行。Travel OS 不接受 service account JSON、私鑰或 server secret。

## 開發與驗證

需要 Node.js 22 或相容版本。

```bash
npm ci
npm run check
npm run test:rules
```

`npm run check` 執行單元測試與 production build。`npm run test:rules` 需要 Java 21，會啟動 Firebase Realtime Database Emulator 驗證 owner／editor／viewer 及跨旅程隔離。

## 資料與隱私

本機模式使用 IndexedDB。自行部署的版本只有在使用者主動設定 Firebase 後，才會連線到指定專案。選擇「記住這台裝置」只會保存公開 Web config 與選填的 browser key，不保存密碼。詳細行為與備份差異請見 [資料與備份說明](docs/DATA_AND_BACKUPS.zh-TW.md)。

## 專案狀態

目前版本是 beta。核心本機流程與 Firebase Rules 已自動測試；正式 Firebase 專案仍需由每位專案擁有者自行完成 Authentication、授權網域與 Rules 設定。Google Places 等需要額外 API 或後端代理的能力尚未包含。

## 文件

- [Firebase 設定指南](docs/FIREBASE_SETUP.zh-TW.md)
- [自行部署指南](docs/SELF_HOSTING.zh-TW.md)
- [資料與備份](docs/DATA_AND_BACKUPS.zh-TW.md)
- [架構決策](docs/decisions/001-local-first-adapters.md)
- [貢獻指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
- [第三方授權與素材](THIRD_PARTY_NOTICES.md)

## License

程式碼採用 [MIT License](LICENSE)。第三方套件依各自授權條款使用。
