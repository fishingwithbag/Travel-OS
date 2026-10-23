# 第一次使用者設定實測紀錄

本紀錄依官方文件與實際瀏覽器畫面逐步檢查。只把親自完成的步驟標為通過；未建立新帳號或新雲端專案的部分不算通過。

| 步驟 | 實際結果 | 發現與修正 |
| --- | --- | --- |
| GitHub 註冊 | 已開啟註冊頁；安全驗證與新帳號憑證需要真人完成，尚未建立新帳號 | 精靈與自行部署文件新增官方註冊連結及電子郵件驗證前置步驟。 |
| 從範本建立 repository | 在既有登入狀態下，確認表單有 Owner、Repository name、Public 與 Create repository；未提交建立 | 文件補上 Actions 未執行／初次失敗時手動執行 `Deploy GitHub Pages` 的操作。 |
| Firebase／Google Cloud 入口 | 確認兩個控制台已是既有 Google 帳戶的登入狀態；未拿既有帳戶冒充新使用者建立資源 | 精靈與文件補上 Google 帳戶註冊入口，並說明 Firebase 專案也會建立對應 Google Cloud 專案。 |
| Google Maps | 官方 Maps URLs 說明確認目前外部導航不需要 API Key | Step 3 維持免 Key 說明，不要求新手建立不必要的付費 Maps API。 |
| 新帳號端到端連線與建立旅程 | 尚未執行 | 待新 GitHub／Google 帳號完成註冊與驗證後，再建立 Pages、Firebase、Auth 使用者與 RTDB，最後於自己的網站測試 Step 5 和建立旅程。 |

參考官方文件：[GitHub 註冊](https://docs.github.com/en/account-and-profile/how-tos/account-management/creating-an-account-on-github)、[GitHub 範本](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)、[Google 帳戶](https://support.google.com/accounts/answer/27441?hl=zh-hant)、[Firebase 專案與 Google Cloud 的關係](https://firebase.google.com/docs/projects/learn-more)、[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)。
