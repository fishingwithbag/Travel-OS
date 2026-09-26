# 自行部署 Travel OS

公開體驗站由 repository 維護者控制，因此只開放 IndexedDB 本機模式，不接受 Firebase config 或帳號密碼。Travel OS 雲端同步以「自己的網站 + 自己的 Firebase」為主軸；請先建立由自己控制的網站副本。

## GitHub Pages

1. 登入 GitHub，開啟 [Travel OS repository](https://github.com/fishingwithbag/Travel-OS)。
2. 在 repository 頁面按 **Use this template** → **Create a new repository**。
3. **Owner** 選你的 GitHub 帳號。
4. **Repository name** 輸入 `你想為此旅遊網頁命名的名稱`。若使用 GitHub Free，請選 **Public**。
5. 按 **Create repository**。
6. 進入剛建立的 repository，點上方 **Settings**。
7. 左側選單找到 **Pages**。
8. 在 **Build and deployment** 的 **Source** 選 **GitHub Actions**。
9. 回 repository 上方 **Actions**，等待 Pages workflow 顯示綠色成功。
10. 再回 **Settings → Pages**，點 **Visit site**。
11. 你的網址通常會是 `https://你的帳號.github.io/旅遊網頁命名的名稱/`。請確認設定精靈顯示的是你自己的網址。

這份副本會使用你的 GitHub 帳號、網域與 Actions。你可以核對 commit、workflow 和部署紀錄；上游 repository 無法修改你已部署的版本，除非你自行同步更新。

## 第一次啟動：先完成雲端同步設定

第一次開啟自己的網站副本時，Travel OS 會自動打開設定精靈。依序完成：

1. 確認目前網址就是你自己的 GitHub Pages／自訂網域。
2. 建立 **Firebase Spark** project、Web App、Email/Password Authentication、使用者帳號、Realtime Database（Locked mode）與 Travel OS Rules。
3. 分別貼上 Firebase Web `firebaseConfig` 與 Realtime Database「資料」頁籤上方的 URL；不必手動改寫 `firebaseConfig`。
4. 了解 Google Maps 外部導航；目前不需要 Google Cloud project、Billing 或 API Key。
5. 輸入 Firebase Email/Password。
6. 由 Travel OS 自動驗證 Authentication，以及在本人 UID 範圍內的 Realtime Database 寫入、讀取與刪除。

如果目前只想試用或離線工作，可以在精靈選擇「先使用本機模式」。這是 fallback，而不是正式 self-host 的主要 onboarding 路徑。

若之後啟用 Google 登入、Email Link 或其他 redirect 驗證方式，Authorized domains 應加入你自己的 GitHub Pages hostname，例如：

```text
your-name.github.io
```

不要加入官方公開體驗站的 hostname，也不要將 service account、Admin SDK 私鑰或 server key 放進瀏覽器。

## 更新

安全更新發布後，可從上游 repository 比較變更再合併。更新前先匯出完整備份，完成後確認 CI、Pages 與 Firebase Rules 測試通過。
