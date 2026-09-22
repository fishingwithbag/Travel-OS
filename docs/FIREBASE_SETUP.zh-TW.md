# Firebase 設定指南

Travel OS 的設定精靈不需修改程式或重新建置：先將 Travel OS 部署到自己控制的網站，準備好自己的 Firebase 專案後，直接在網站內貼上 Web config 並登入。官方公開體驗站只提供本機模式，不接受 Firebase、API key 或帳號密碼。瀏覽器不能代替專案擁有者建立雲端資源或安全規則。

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

將 repository 的 [`firebase/database.rules.json`](../firebase/database.rules.json) 部署到該 Database。可在 Firebase Console 的 Rules 分頁貼上，或由專案維護者使用 Firebase CLI：

```bash
firebase use YOUR_PROJECT_ID
firebase deploy --only database
```

這組規則預設拒絕所有未授權存取，並以旅程 membership 實作 owner／editor／viewer 權限。

## 4. 在 Travel OS 連線

1. 開啟「設定」。
2. 貼上整段 Firebase Web config。
3. 輸入該 Firebase 專案中的 Email 與密碼。
4. 使用 Firebase Console 已建立的帳號，按「驗證並登入」。
5. 精靈會進行本人範圍的診斷寫入並立即刪除，再載入該帳號可見的旅程。

「連線成功」只代表登入、基本 Rules 與診斷讀寫可用，不等於完整安全稽核。修改規則後應執行 repository 的 Emulator 測試。

## Google Maps browser key（選填）

不設定 key 時，地址仍可用 Google Maps 通用網址開啟。若設定 browser key，請在 Google Cloud Console：

- 只啟用實際需要的瀏覽器 API。
- 設定 HTTP referrer 限制，包含正式網域與必要的本機來源。
- 設定 API restrictions 與費用／配額告警。

不要將 server key 放進瀏覽器。需要伺服器權限的 API 應由自行管理的後端代理呼叫。

## 常見問題

- `Email 或密碼不正確`：確認帳號屬於目前 config 指向的專案。
- `尚未啟用 Email/Password`：到 Authentication 啟用登入方式。
- `目前網域尚未加入`：把網站網域加入 Authorized domains。
- `Rules 拒絕存取`：部署本 repository 的 Rules，並確認 `databaseURL` 指向正確 instance。
- 切換專案後看不到原資料：資料依 Firebase instance、project 與 UID 隔離，這是預期行為。
