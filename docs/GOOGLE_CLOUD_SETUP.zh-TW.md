# Google Cloud / Maps Browser Key 設定指南

Travel OS 的自行部署版本會在雲端設定精靈中驗證你自己的 **Google Maps Browser Key**。這把 Key 只供瀏覽器端的 **Maps JavaScript API / Places** 使用；Routes、Geocoding、Weather 等伺服器 API 必須使用另一把 Server Key，並放在你自己的後端 Secret Manager 或等效 secret storage。

> Browser Key 會出現在瀏覽器送往 Google 的請求中，因此無法被「藏成真正秘密」。安全重點是讓偷到 Key 的人無法在其他網站或其他 API 使用它：一定要同時設定 **Website restrictions** 與 **API restrictions**，並設定配額／帳務告警。

## 1. 建立或選擇 Google Cloud project

1. 登入 [Google Cloud Console](https://console.cloud.google.com/)。
2. 在頂端 project 選單建立一個新 project，或選擇專門給這個 Travel OS 使用的 project。
3. 到 **Billing**，確認 project 已連結有效 Billing account。Google Maps Platform production 使用需要 Billing。

建議不要和其他不相關網站共用同一把 API Key。每一個 Travel OS 網站使用自己的 Browser Key，日後要輪替或撤銷會比較安全。

## 2. 啟用需要的 Maps API

到 **Google Maps Platform → APIs & Services**，啟用：

- Maps JavaScript API
- Places API
- Places API (New)

Travel OS 設定精靈會載入 Maps JavaScript API，並呼叫 `google.maps.importLibrary('places')` 驗證 Places 是否可用。

## 3. 建立 Browser Key

1. 開啟 **Google Maps Platform → Keys & Credentials**。
2. 選擇 **Create credentials → API key**。
3. 建立後立刻點進這把 Key 編輯限制，不要把 unrestricted key 直接投入使用。
4. 建議命名為 `Travel OS Browser Key` 或其他能辨識用途的名稱。

## 4. 設定 Website restrictions

在 **Application restrictions** 選 **Websites**。

加入你實際部署 Travel OS 的網站。例如 GitHub Pages：

```text
https://YOUR_USERNAME.github.io/*
```

如果使用自訂網域，例如：

```text
https://travel.example.com/*
```

本機 Vite 測試若使用 `http://localhost:5173`，可另外加入：

```text
http://localhost:5173/*
```

Travel OS 載入 Maps JavaScript API 時使用 `auth_referrer_policy=origin`。不要只依賴很細的 URL path 當唯一限制；現代瀏覽器在跨來源請求時可能縮減 referrer path。

設定精靈會依目前網站 origin 顯示建議值，你應確認它和 Cloud Console 裡的 Website restriction 相符。

## 5. 設定 API restrictions

在同一把 Browser Key 的 **API restrictions**：

1. 選擇 **Restrict key**。
2. 只允許：
   - Maps JavaScript API
   - Places API
   - Places API (New)
3. 儲存設定。

不要把 Routes API、Geocoding API、Weather API 或其他 server-side API 加進這把 Browser Key。

## 6. 設定配額與帳務防護

Website/API restrictions 是防止 Key 被拿去其他地方使用的第一道防線；配額是限制異常用量的第二道防線。

在 Google Cloud / Google Maps Platform 的 Quotas 頁面，依你的旅行網站規模設定合理的每日或每分鐘 request 上限。個人旅行網站通常不需要很高的額度，可先用保守值，確定需求後再調高。

再到 **Billing → Budgets & alerts** 建立預算與告警，例如 50%、80%、100%。一般「Budget alert」只負責通知，並不等同硬性停止 API 使用；若要限制實際用量，仍要設定 API quota，或使用 Google Cloud 當下可用的 spend-cap 功能。

## 7. 回 Travel OS 驗證

回到你自己的 Travel OS：

1. 開啟「設定」。
2. 在 Step 2 貼入 Browser Key。
3. Travel OS 不會把 Key放進 URL、repository 或備份檔。
4. 若勾選「記住這台裝置」，受限制的 Browser Key 會和公開 Firebase Web config 一起保存在目前瀏覽器的 localStorage；密碼不保存。
5. 按「驗證 Google + Firebase 並啟用雲端」。

驗證失敗時優先檢查：Billing、API 是否啟用、Website restriction 是否包含目前 origin、API restrictions 是否包含 Maps JavaScript API / Places，以及 quota 是否用盡。

## Server Key：另一條完全不同的安全邊界

如果未來啟用 Routes、Geocoding、Weather：

```text
Travel OS browser
    ↓ authenticated request
你的後端 / Firebase Functions
    ↓
Secret Manager 中的 Server Key
    ↓
Google server-side API
```

Server Key 不得出現在：

- HTML / JavaScript bundle
- GitHub repository
- Browser localStorage / IndexedDB
- Network request query string 由前端直接送出
- Travel OS 設定精靈

這條規則和 Browser Key 不同；Browser Key 是可見但受限制的 client credential，Server Key 則必須保持秘密。
