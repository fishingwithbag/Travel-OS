# Firebase 設定指南

這份文件假設你第一次使用 Firebase。請照順序操作，不要跳步。Travel OS 的 Firebase 只負責 Authentication、Realtime Database 與多人同步；目前的 Google Maps 外部導航不需要 Google Cloud project 或 API Key。

> 重要：這個 Firebase project 請維持 **Spark 免費方案**。目前不需要連結 Cloud Billing 或啟用 Google Maps API；連結 Cloud Billing 會升級成 Blaze。

開始前，請先完成[GitHub Pages 自行部署](SELF_HOSTING.zh-TW.md)，並確認你已經能開啟自己的 Travel OS 網址。

## 1. 建立 Firebase 專案

1. 開啟 [Firebase 控制台](https://console.firebase.google.com/)。
2. 按 **建立專案**。
3. 專案名稱可填 `My Travel OS`。
4. Google Analytics 不是 Travel OS 必要功能，可略過。
5. 建立完成後會進入 **專案總覽**。
6. 保持 **Spark** 免費方案；如果流程要求你連結 Billing／升級 Blaze，先停止並確認自己是否選錯 project。

官方說明：[Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

## 2. 註冊網頁應用程式

目的：讓 Firebase 知道「Travel OS 是一個 Web App」，並產生前端連線需要的 `firebaseConfig`。

1. 在 Firebase 控制台的 **專案總覽** 頁面，點 **`</>` 網頁** 圖示。
2. 如果專案已經有其他應用程式，改按 **新增應用程式 → 網頁**。
3. **應用程式暱稱**輸入 `Travel OS`。
4. 如果看到 Firebase Hosting 選項，不要勾。Travel OS 已經使用 GitHub Pages。
5. 按 **註冊應用程式**。
6. Firebase 會顯示一份 `firebaseConfig`。稍後會再回到「專案設定」複製；**不需要自己把 databaseURL 編輯進去**。

官方說明：[Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)

## 3. 啟用電子郵件／密碼 Authentication

Authentication 是「登入帳號管理」，不是 Google Cloud IAM。

1. Firebase 控制台左側進入 **Authentication（驗證）**。
2. 第一次使用時按 **開始使用**。
3. 切到 **登入方式**。
4. 點 **電子郵件地址/密碼**。
5. 將電子郵件地址／密碼登入設為 **啟用**。
6. 不需要啟用 **電子郵件連結**。
7. 按 **儲存**。

官方說明：[Password-based Authentication](https://firebase.google.com/docs/auth/web/password-auth)

## 4. 建立第一個登入帳號

Travel OS 目前不提供公開註冊，所以由 Firebase project 擁有者決定哪些帳號可以登入。

1. 留在 **Authentication（驗證）**。
2. 切到 **使用者**。
3. 按 **新增使用者**。
4. 電子郵件輸入你自己的 Email。
5. 設定一組密碼（Firebase 預設至少 6 字元；若你另外設定更嚴格 Password policy，請遵守該規則）。
6. 建立後記住這組 Email / Password；稍後會填到 Travel OS 設定精靈的「登入」步驟。

旅伴日後也可以在同一個「使用者」頁面按 **新增使用者** 建立帳號。Travel OS 的 owner／editor／viewer 角色不是 IAM，而是旅程資料與 Database Rules 的權限。

## 5. 建立 Realtime Database

Realtime Database 是實際存放 Travel OS 雲端旅程的地方。

1. Firebase 控制台左側進入 **Realtime Database**。
2. 按 **建立資料庫**。
3. 選擇離主要使用者較近的資料庫位置。位置建立後不能直接更換，請先確認。
4. 起始安全規則請選 **鎖定模式**。
5. **不要選測試模式**。Firebase 官方說測試模式會允許公開讀寫。
6. 按 **完成**。

建立後，Realtime Database URL 會是：

```text
https://DATABASE_NAME.firebaseio.com
```

或：

```text
https://DATABASE_NAME.REGION.firebasedatabase.app
```

官方說明：[Realtime Database Web setup](https://firebase.google.com/docs/database/web/start)

## 6. 複製 Realtime Database URL

這個網址要**另外從 Realtime Database 頁面複製**，不要自己加進 `firebaseConfig`。

1. Firebase 控制台左側點 **Realtime Database**。
2. 切到上方 **資料** 頁籤。
3. 在資料區上方找到一串以 `https://` 開頭的網址，旁邊有連結圖示。
4. 複製這串網址，例如：

```text
https://my-travel-os-default-rtdb.firebaseio.com
```

5. **不要複製資料樹裡的 `/: null`**。那只是代表目前資料庫根節點沒有資料，不是網址的一部分。

Firebase 官方說，Realtime Database URL 可以直接在 Firebase 控制台的 Realtime Database 區域找到；`us-central1` 使用 `*.firebaseio.com`，其他區域使用 `*.REGION.firebasedatabase.app`。

## 7. 部署 Travel OS Realtime Database Rules

鎖定模式目前會拒絕所有網頁端讀寫，所以要換成 Travel OS 的 Rules。

最簡單的方法：

1. 回 Travel OS 設定精靈的 Firebase 頁。
2. 按 **複製 Travel OS Rules**。
3. 回 Firebase 控制台 → **Realtime Database**。
4. 切到 **規則** 頁籤。
5. 將編輯器裡原本內容全部選取並刪除。
6. 貼上剛才複製的 Travel OS Rules。
7. 按 **發布**。

這組 Rules 會以 Firebase Authentication 的 UID 與旅程 membership 控制 owner／editor／viewer，並驗證 Travel OS 資料格式。Firebase 官方說 Realtime Database Rules 會在 Firebase server 端對每次 read/write 強制執行。

官方說明：[Realtime Database Security](https://firebase.google.com/docs/database/security) · [Security Rules getting started](https://firebase.google.com/docs/database/security/get-started)

進階使用者若想用 CLI，可使用：

```bash
npm run firebase:rules:configure -- --project YOUR_PROJECT_ID
npm run firebase:rules:deploy
```

OpenSource repository 不會自行猜 Firebase project；Database deploy 會經過 deployment boundary guard。

## 8. 取得 firebaseConfig

現在回去取得 Travel OS 要使用的 Firebase Web config。**這份 config 沒有 databaseURL 也沒關係**，因為上一節已經另外取得 Realtime Database URL。

操作路徑：

```text
Firebase 控制台
→ 左上齒輪 ⚙
→ 專案設定
→ 一般
→ 往下找到「您的應用程式」
→ 點 Travel OS 網頁應用程式
→ SDK 設定與配置
→ 選「設定」
```

你會看到類似：

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-travel-os.firebaseapp.com",
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

不要複製 `npm install firebase`、`import ...` 等程式碼，也不要只複製 `apiKey`。**不要手動編輯 firebaseConfig，也不用加入 databaseURL。**

## 9. 貼回 Travel OS

1. 回到你自己的 Travel OS 網站。
2. 開啟設定精靈 → **Firebase**。
3. 找到 **把剛才複製的完整 firebaseConfig 貼在這裡**，貼上整段 `const firebaseConfig = { ... };`。
4. 找到下面的 **Realtime Database URL** 欄位，貼上第 6 節從 Realtime Database →「資料」頁籤複製的 HTTPS 網址。
5. 按 **下一步**。
6. Travel OS 會把兩份設定自動合併，並顯示已辨識的：
   - Project ID
   - Auth Domain
   - Realtime Database URL
7. 如果這三項正確，再繼續 Google Maps 設定。

## 10. 常見錯誤

- **缺少 Realtime Database URL**：Firebase 控制台 → Realtime Database →「資料」→ 複製頁面上方的 HTTPS 網址，再貼到 Travel OS 的 Realtime Database URL 欄位。
- **Email 或密碼不正確**：確認帳號存在於目前 Firebase 專案的 Authentication →「使用者」。
- **電子郵件地址/密碼尚未啟用**：Authentication →「登入方式」→「電子郵件地址/密碼」→ 啟用 → 儲存。
- **PERMISSION_DENIED / Rules 拒絕存取**：確認 Realtime Database →「規則」已發布 Travel OS Rules，而不是鎖定模式原始規則或測試模式。
- **看到 Blaze / Billing**：目前的設定流程不需要 Billing；請確認 Firebase project 仍維持 Spark。

完成這一頁後，可閱讀 [Google Maps 導航說明](GOOGLE_CLOUD_SETUP.zh-TW.md)；目前不需另外設定 Google Cloud。
