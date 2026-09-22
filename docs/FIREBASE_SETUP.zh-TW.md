# Firebase 設定指南

Travel OS 的 self-host 版本把雲端同步當作第一次使用的主流程。先將 Travel OS 部署到自己控制的網站，準備好自己的 Firebase 與 Google Cloud 後，第一次開啟網站會自動進入雲端同步設定精靈。官方公開體驗站只提供本機模式，不接受 Firebase、API key 或帳號密碼。

開始前請先完成[自行部署](SELF_HOSTING.zh-TW.md)。不要在由陌生人控制或無法核對原始碼的 Travel OS 網站輸入帳號密碼。

## 1. 建立 Firebase 專案與 Web app

1. 在 Firebase Console 建立專案。
2. 新增 Web app；不需要先啟用 Hosting。
3. 複製完整的 `firebaseConfig`。內容應包含 `apiKey`、`authDomain`、`databaseURL`、`projectId`、`storageBucket`、`messagingSenderId`、`appId`。

請勿貼上 service account、Admin SDK 私鑰或任何 server secret。Travel OS 會拒絕這些格式。

## 2. 啟用登入

在 Authentication → Sign-in method 啟用 Email/Password，接著到 Users 建立允許使用 Travel OS 的登入帳號。Travel OS 前端不提供自行註冊，避免公開自架站被濫用來建立大量 Auth 使用者。一般 Email/Password 登入不需要將公開體驗站加入 Authorized domains。只有啟用 Google、Email Link 或其他 redirect 流程時，才在 Settings → Authorized domains 加入你自己部署網站的網域；本機測試需要時加入 `localhost`。

## 3. 建立 Realtime Database

建立 Realtime Database，地區可依主要使用者所在地選擇。不要使用公開讀寫的測試規則。

將 repository 的 [`firebase/database.rules.json`](../firebase/database.rules.json) 部署到**你自己的 Firebase 專案**。可在 Firebase Console 的 Rules 分頁貼上，或使用 repository 提供的受保護 CLI 流程：

```bash
npm run firebase:rules:configure -- --project YOUR_PROJECT_ID
npm run firebase:rules:deploy
```

OpenSource repository 不會從 `firebase projects:list`、目前登入帳號或既有 `.firebaserc` 推測 production target。Database deploy 另有 `predeploy` guard；即使直接執行 `firebase deploy --only database --project ...`，目標也必須和本機明確核准的 project 完全一致。

專案維護者若同時管理其他私人 Firebase，可在本機建立不進 Git 的 `.firebase-private-projects.local.json`：

```json
{
  "blockedProjects": ["PRIVATE_PROJECT_ID"]
}
```

列在這裡的 project 永遠不能從 Travel OS OpenSource repository 部署 Rules。

這組規則預設拒絕所有未授權存取，並以旅程 membership 實作 owner／editor／viewer 權限。

## 4. 準備 Google Maps Browser Key

雲端設定精靈同時需要你自己的 Google Maps Browser Key。請依 [Google Cloud / Maps Browser Key 設定指南](GOOGLE_CLOUD_SETUP.zh-TW.md)建立 Key，並完成 Website restrictions、API restrictions、quota 與 Billing alert。

Browser Key 不是 Server Key。不要將 Routes、Geocoding、Weather 使用的後端 Server Key 貼進 Travel OS。

## 5. 在 Travel OS 連線

1. 開啟「設定」。
2. 貼上整段 Firebase Web config。
3. 貼上受限制的 Google Maps Browser Key。
4. 輸入該 Firebase 專案中的 Email 與密碼。
5. 使用 Firebase Console 已建立的帳號，按「驗證 Google + Firebase 並啟用雲端」。
6. 精靈會先載入 Maps JavaScript API 並驗證 Places，再進行 Firebase 本人範圍的診斷寫入並立即刪除，最後載入該帳號可見的旅程。

「連線成功」只代表登入、基本 Rules 與診斷讀寫可用，不等於完整安全稽核。修改規則後應執行 repository 的 Emulator 測試。

## Google API 金鑰邊界

- **Browser Key**：由 self-host 使用者自己建立，設定精靈會驗證 Maps JavaScript API / Places。這把 Key 在瀏覽器技術上可見，所以必須使用 Website restrictions、API restrictions 與 quota；UI 遮罩只避免肩窺，不代表 Key 變成秘密。
- **Server Key**：Routes、Geocoding、Weather 等伺服器 API 必須由使用者自己的後端使用 Server Key 呼叫。Server Key 不得放進瀏覽器、`localStorage`、repository 或前端建置產物，也不會被設定精靈接受。

## 常見問題

- `Email 或密碼不正確`：確認帳號屬於目前 config 指向的專案。
- `尚未啟用 Email/Password`：到 Authentication 啟用登入方式。
- `目前網域尚未加入`：把網站網域加入 Authorized domains。
- `Rules 拒絕存取`：部署本 repository 的 Rules，並確認 `databaseURL` 指向正確 instance。
- 切換專案後看不到原資料：資料依 Firebase instance、project 與 UID 隔離，這是預期行為。
