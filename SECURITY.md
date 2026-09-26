# Security Policy

## Supported versions

安全修正目前提供給最新 beta 與 `main` 分支。

## 回報漏洞

請使用 GitHub repository 的 **Security → Report a vulnerability** 私密回報功能。請勿在公開 Issue 放入漏洞細節、Firebase 設定、API key、旅程資料或可識別個人的備份。

回報請包含受影響版本、重現步驟、可能影響與建議修正。維護者確認前，請避免存取不屬於自己的資料。

## 安全邊界

- Firebase Web config 會在瀏覽器可見；它不能取代 Authentication、Database Rules 或配額限制。
- 目前 Google Maps 外部導航使用免 Key 的 Maps URL，不接收或驗證 Browser Key。Routes／Geocoding／Weather Server Key 不得進入前端。
- Travel OS 不需要且不接受 service account、Admin SDK 私鑰、OAuth client secret 或 server key。
- 官方公開體驗站只開放本機模式，不接受 Firebase config、Google API key 或帳號密碼；雲端模式只供自行部署版本使用。
- 每位自行部署者必須維護自己的 Firebase Rules 與 Authentication。若將來自行加入付費 Google API，需另外管理 Key 限制、配額與帳務。
- OpenSource repository 沒有 maintainer production Firebase target。Database Rules 部署必須先在本機明確核准 self-host 專案，並通過 `firebase.json` 的 predeploy boundary guard；不得從 Firebase 帳號中的既有 project 推測部署目標。
- 設定精靈的診斷成功不是完整安全稽核；Rules Emulator 測試才是 repository 的權限回歸檢查。
