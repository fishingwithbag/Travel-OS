# Security Policy

## Supported versions

安全修正目前提供給最新 beta 與 `main` 分支。

## 回報漏洞

請使用 GitHub repository 的 **Security → Report a vulnerability** 私密回報功能。請勿在公開 Issue 放入漏洞細節、Firebase 設定、API key、旅程資料或可識別個人的備份。

回報請包含受影響版本、重現步驟、可能影響與建議修正。維護者確認前，請避免存取不屬於自己的資料。

## 安全邊界

- Firebase Web config 會在瀏覽器可見；它不能取代 Authentication、Database Rules 或配額限制。
- 目前版本不接收 Google API key。未來 Maps JavaScript／Places 若啟用 Browser Key，該 key 仍會在瀏覽器可見，必須使用 referrer/API restrictions；Routes／Geocoding／Weather Server Key 不得進入前端。
- Travel OS 不需要且不接受 service account、Admin SDK 私鑰、OAuth client secret 或 server key。
- 官方公開體驗站只開放本機模式，不接受 Firebase config 或帳號密碼；雲端模式只供自行部署版本使用。
- 每位自行部署者必須維護自己的 Firebase Rules、Authentication、授權網域與 Google Cloud 限制。
- 設定精靈的診斷成功不是完整安全稽核；Rules Emulator 測試才是 repository 的權限回歸檢查。
