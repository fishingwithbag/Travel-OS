# Firebase 設定指南

這份文件假設你第一次使用 Firebase。請照順序操作，不要跳步。Travel OS 的 Firebase 只負責 Authentication、Realtime Database 與多人同步；Google Maps 請使用另一個 Google Cloud project。

> 重要：這個 Firebase project 請維持 **Spark 免費方案**。不要在同一 project 連結 Cloud Billing，也不要直接拿它去開 Google Maps API。Firebase 官方說，同一 project 連結 Cloud Billing 或使用 Google Maps API 時，會從 Spark 升級成 Blaze。

開始前，請先完成[GitHub Pages 自行部署](SELF_HOSTING.zh-TW.md)，並確認你已經能開啟自己的 Travel OS 網址。

## 1. 建立 Firebase Project

1. 開啟 [Firebase Console](https://console.firebase.google.com/)。
2. 按 **Create a project / 建立專案**。
3. Project name 可填 `My Travel OS`。
4. Google Analytics 不是 Travel OS 必要功能，可略過。
5. 建立完成後進入 Project Overview。
6. 保持 **Spark** 免費方案；如果流程要求你連結 Billing／升級 Blaze，先停止並確認自己是否選錯 project。

官方說明：[Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

## 2. Register Web App

目的：讓 Firebase 知道「Travel OS 是一個 Web App」，並產生前端連線需要的 `firebaseConfig`。

1. 在 Firebase Console 的 **Project Overview** 頁面，點 **`</>` Web** 圖示。
2. 如果 project 已經有其他 App，改按 **Add app → Web**。
3. **App nickname** 輸入 `Travel OS`。
4. 如果看到 **Also set up Firebase Hosting**，不要勾。Travel OS 已經使用 GitHub Pages。
5. 按 **Register app**。
6. Firebase 會先顯示一份 `firebaseConfig`，這時先不用複製。等 Realtime Database 建好後，再重新取得一次最新版本，確保有 `databaseURL`。

官方說明：[Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)

## 3. 啟用 Email/Password Authentication

Authentication 是「登入帳號管理」，不是 Google Cloud IAM。

1. Firebase Console 左側進入 **Security → Authentication**。
2. 第一次使用時按 **Get started**。
3. 切到 **Sign-in method**。
4. 點 **Email/Password**。
5. 打開 **Email/Password** 的 Enable。
6. 不需要開 **Email link (passwordless sign-in)**。
7. 按 **Save**。

官方說明：[Password-based Authentication](https://firebase.google.com/docs/auth/web/password-auth)

## 4. 建立第一個登入帳號

Travel OS 目前不提供公開註冊，所以由 Firebase project 擁有者決定哪些帳號可以登入。

1. 留在 **Security → Authentication**。
2. 切到 **Users**。
3. 按 **Add user**。
4. Email 輸入你自己的 Email。
5. 設定一組密碼（Firebase 預設至少 6 字元；若你另外設定更嚴格 Password policy，請遵守該規則）。
6. 建立後記住這組 Email / Password；稍後會填到 Travel OS 設定精靈的「登入」步驟。

旅伴日後也可以在同一個 Users 頁面用 **Add user** 建立帳號。Travel OS 的 owner／editor／viewer 角色不是 IAM，而是旅程資料與 Database Rules 的權限。

## 5. 建立 Realtime Database

Realtime Database 是實際存放 Travel OS 雲端旅程的地方。

1. Firebase Console 左側進入 **Databases & Storage → Realtime Database**。
2. 按 **Create database**。
3. 選擇離主要使用者較近的 Database location。建立後 location 不適合當成隨時可改的設定，請先確認再建立。
4. Security Rules starting mode 請選 **Locked mode**。
5. **不要選 Test mode**。Firebase 官方說 Test mode 允許任何人讀取與覆寫資料。
6. 按 **Done**。

建立後 Database URL 通常會是：

```text
https://DATABASE_NAME.firebaseio.com
```

或：

```text
https://DATABASE_NAME.REGION.firebasedatabase.app
```

官方說明：[Realtime Database Web setup](https://firebase.google.com/docs/database/web/start)

## 6. 部署 Travel OS Realtime Database Rules

Locked mode 目前會拒絕所有 Web client 讀寫，所以要換成 Travel OS 的 Rules。

最簡單的方法：

1. 回 Travel OS 設定精靈的 Firebase 頁。
2. 按 **複製 Travel OS Rules**。
3. 回 Firebase Console → **Realtime Database**。
4. 切到 **Rules / Security Rules**。
5. 將編輯器裡原本內容全部選取並刪除。
6. 貼上剛才複製的 Travel OS Rules。
7. 按 **Publish**。

這組 Rules 會以 Firebase Authentication 的 UID 與旅程 membership 控制 owner／editor／viewer，並驗證 Travel OS 資料格式。Firebase 官方說 Realtime Database Rules 會在 Firebase server 端對每次 read/write 強制執行。

官方說明：[Realtime Database Security](https://firebase.google.com/docs/database/security) · [Security Rules getting started](https://firebase.google.com/docs/database/security/get-started)

進階使用者若想用 CLI，可使用：

```bash
npm run firebase:rules:configure -- --project YOUR_PROJECT_ID
npm run firebase:rules:deploy
```

OpenSource repository 不會自行猜 Firebase project；Database deploy 會經過 deployment boundary guard。

## 7. 重新取得「最新」firebaseConfig

現在 Authentication 與 Realtime Database 都建立好了，才回去取得最後要貼進 Travel OS 的 config。

操作路徑：

```text
Firebase Console
→ 左上齒輪 ⚙
→ Project settings
→ General
→ 往下找到 Your apps
→ 點 Travel OS Web App
→ SDK setup and configuration
→ 選 Config
```

你會看到類似：

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-travel-os.firebaseapp.com",
  databaseURL: "https://my-travel-os-default-rtdb.REGION.firebasedatabase.app",
  projectId: "my-travel-os",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

請從：

```text
const firebaseConfig = {
```

一路複製到最後：

```text
};
```

不要複製 `npm install firebase`、`import ...` 等程式碼，也不要只複製 `apiKey`。

如果 config 裡沒有 `databaseURL`，通常代表你是在 Realtime Database 建立前複製了舊 config。請回上面的 Project settings 路徑重新取得最新版本。

## 8. 貼回 Travel OS

1. 回到你自己的 Travel OS 網站。
2. 開啟設定精靈 → **Firebase**。
3. 找到 **把剛才複製的完整 firebaseConfig 貼在這裡**。
4. 貼上整段 `const firebaseConfig = { ... };`。
5. 按 **下一步**。
6. Travel OS 會先顯示已辨識的：
   - Project ID
   - Auth Domain
   - Realtime Database URL
7. 如果這三項正確，再繼續 Google Maps 設定。

## 9. 常見錯誤

- **firebaseConfig 缺少 databaseURL**：先建立 Realtime Database，再回 Project settings → General → Your apps → Travel OS → SDK setup and configuration → Config 重新複製。
- **Email 或密碼不正確**：確認帳號存在於目前這個 Firebase project 的 Authentication → Users。
- **Email/Password 尚未啟用**：Security → Authentication → Sign-in method → Email/Password → Enable → Save。
- **PERMISSION_DENIED / Rules 拒絕存取**：確認 Realtime Database → Rules 已發布 Travel OS Rules，而不是 Locked mode 原始規則或 Test mode。
- **看到 Blaze / Billing**：這個 Firebase project 應維持 Spark。Google Maps Billing 請放在另一個 Google Cloud project。

完成這一頁後，再依 [Google Cloud / Maps Browser Key 設定指南](GOOGLE_CLOUD_SETUP.zh-TW.md)設定 Google Maps。
