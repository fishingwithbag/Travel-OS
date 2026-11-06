# 建立者設定一次，旅伴只需登入

網站建立者管理 GitHub 部署、Firebase 專案、Authentication 使用者及選配 Google 服務。受邀旅伴不需要 GitHub、Google Cloud 或 Firebase Console 帳號，也不需要選擇 Firebase 方案。

## 建立者首次發布

1. 依[自行部署指南](SELF_HOSTING.zh-TW.md)部署自己的網站，完成六步設定精靈並通過登入與本人範圍讀寫驗證。
2. 在完成畫面按「匯出網站連線設定」，下載 `site-config.json`。若有使用 Google 搜尋／估算，先確認已套用正確且限制網站及 API 的 Browser Key，再匯出。
3. 在自己的 GitHub repository 開啟 **Settings → Secrets and variables → Actions → New repository secret**。名稱填 `TRAVEL_OS_SITE_CONFIG`，內容貼上下載檔案的完整 JSON，再儲存。參考 [GitHub 官方說明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。
4. 到 **Actions → Deploy GitHub Pages → Run workflow**，等待部署成功。建置會驗證設定並將 allowlist 欄位放入網站部署產物，不會寫入 Git 原始碼或 commit。
5. 用新的瀏覽器開啟自己的網站，應直接看到「登入 Travel OS」，只有網站 Email 與密碼，不再要求貼 config 或走設定精靈。
6. 建立者在同一 Firebase 專案的 Authentication 準備旅伴登入帳號，由旅程 owner 在網站的成員管理授予 editor／viewer。旅伴使用網站帳號登入即可。

這項設定不會建立 Firebase 專案、使用者、資料庫或 Rules；這些仍由建立者一次準備。訪客也不會自動取得旅程權限。未獲授權的人不能靠知道設定檔讀寫旅程。

## 設定檔內容與保護

只接受 `schemaVersion: 1`、`firebase`（公開 Firebase Web config）及選填 `googleMapsKey`。禁止密碼、service account、私鑰、登入 token 或 server secret；不包含旅程或成員資料。

**網站中的 Web config 與 Browser Key 可被訪客讀取。** Actions secret 用於避免把專案設定放入公開 Git 歷史，不會把瀏覽器設定變成伺服器秘密。資料由 Authentication、Realtime Database Rules 與 membership 保護；Google Key 必須限制網站來源與 API。參考 [Firebase 公開設定說明](https://firebase.google.com/docs/projects/api-keys)及 [Google Key 保護指引](https://developers.google.com/maps/api-security-best-practices)。

不要把個人密碼、Admin SDK JSON 或完整私人備份放進 Actions secret。設定檔失效時會阻止雲端登入並顯示聯絡建立者的提示，仍保留本機體驗；不會偷偷改用瀏覽器記住的其他專案。

## 維護與其他部署方式

- 維護設定精靈：開啟自己網站的 `?setup=operator`。這只是顯示維護介面，不會授予資料權限，仍須登入與通過 Rules。
- 修改設定：重新驗證、匯出、更新同名 Actions secret 並重新部署。切換專案不會搬移 Authentication 帳號、旅程或 Rules，須另行準備與驗證。
- 自行使用其他靜態主機：把驗證後的設定檔放在網站根目錄的 `site-config.json`（repo 子路徑也要放在該子路徑）；本機開發可放 `public/site-config.json`。此檔案已被 `.gitignore` 排除。
- 不發布設定檔時，網站保留建立者的六步精靈；官方公開體驗站一律只提供本機模式，不載入個人專案設定。
- 網站不保存旅伴密碼；重新載入後需重新登入。忘記密碼或尚未取得帳號時，聯絡網站建立者。

## 本輪驗證狀態

2026-11-06：本機 production preview 已以既有 viewer 帳號真實登入，未再貼 config 或走六步設定，成功讀回唯一獲授權的共享旅程、跨年航班、下一站備註、停車連結與分幣別費用；群組、費用及成員寫入介面停用。正式 Pages 登入與直接 SDK 越權請求仍待驗；下方 2026-11-05 的「等待輸入密碼」為當時紀錄。

桌面登入視窗已實測 540px 單欄；320／390px 無水平溢出，空白帳密會顯示錯誤。完整證據與未通過項目見[本輪驗證報告](VERIFICATION_ONBOARDING_2026-11-05.zh-TW.md)。提交 `ebc4dcd` 的 [CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/42003383562) 全部通過，包含 40 項 Rules 測試；後續版面修正另由 CI 重跑。

2026-11-05：設定 parser、同站子路徑載入、拒絕憑證與錯誤設定的單元測試通過；production preview 已實際呈現只有 Email／密碼的登入畫面，六步導覽與記住 Firebase 設定選項均隱藏。已準備既有 viewer 帳號的真實登入，等待帳號持有人於瀏覽器輸入密碼；尚不能宣稱旅伴登入後全流程或正式 Pages 部署驗收完成。

本機 178 項單元、build、Rules 產生一致性及依賴稽核通過（0 vulnerabilities）。本輪本機 Emulator 未能啟動：預設 Java 17 不符工具需求；指定既有 Java 21 後遇到 Windows loopback socket 初始化錯誤，指定正式暫存路徑仍失敗，因此不列為本輪權限測試成功。前一提交 `65d47fa` 的 [GitHub CI](https://github.com/fishingwithbag/Travel-OS/actions/runs/41959372208) 成功；本批仍需由 Linux CI 重跑權限測試。
