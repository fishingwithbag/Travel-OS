# 自行部署 Travel OS

公開體驗站由 repository 維護者控制，因此只開放 IndexedDB 本機模式，不接受 Firebase config、API key 或帳號密碼。Travel OS 正式使用以「自己的網站 + 自己的 Firebase + 自己的 Google Cloud」為主軸；請先建立由自己控制的網站副本。

## GitHub Pages

1. 登入 GitHub，開啟 [Travel OS repository](https://github.com/fishingwithbag/Travel-OS)。
2. 按 **Use this template** → **Create a new repository**。
3. 選擇自己的帳號，輸入 repository 名稱並建立。
4. 在新 repository 開啟 **Settings → Pages**。
5. 將 **Source** 設為 **GitHub Actions**。
6. 到 **Actions** 執行 **Deploy GitHub Pages**，或推送任一 commit 讓 workflow 自動執行。
7. 部署成功後，網站通常位於 `https://你的帳號.github.io/你的-repository/`。

這份副本會使用你的 GitHub 帳號、網域與 Actions。你可以核對 commit、workflow 和部署紀錄；上游 repository 無法修改你已部署的版本，除非你自行同步更新。

## 第一次啟動：先完成雲端同步設定

第一次開啟自己的網站副本時，Travel OS 會自動打開「雲端同步設定精靈」。依序完成：

1. 依 [Firebase 設定指南](FIREBASE_SETUP.zh-TW.md)建立 Firebase project、Authentication、Realtime Database 與 Rules。
2. 依 [Google Cloud / Maps Browser Key 指南](GOOGLE_CLOUD_SETUP.zh-TW.md)建立自己的 Google Cloud project 與 Browser Key，設定 Website/API restrictions、quota 與 billing alert。
3. 在精靈貼入 Firebase Web config、Google Maps Browser Key，輸入 Firebase Email/Password。
4. 按「驗證 Google + Firebase 並啟用雲端」。Google Maps/Places 與 Firebase 診斷都通過後，才進入雲端模式。

如果目前只想試用或離線工作，可以在精靈選擇「先使用本機模式」。這是 fallback，而不是正式 self-host 的主要 onboarding 路徑。

若之後啟用 Google 登入、Email Link 或其他 redirect 驗證方式，Authorized domains 應加入你自己的 GitHub Pages hostname，例如：

```text
your-name.github.io
```

不要加入官方公開體驗站的 hostname，也不要將 service account、Admin SDK 私鑰或 server key 放進瀏覽器。

## 更新

安全更新發布後，可從上游 repository 比較變更再合併。更新前先匯出完整備份，完成後確認 CI、Pages 與 Firebase Rules 測試通過。
