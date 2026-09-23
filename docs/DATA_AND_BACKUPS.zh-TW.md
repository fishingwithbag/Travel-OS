# 資料與備份

## 儲存模式

本機模式將旅程放在目前瀏覽器的 IndexedDB。清除瀏覽器網站資料可能一併刪除旅程，請定期匯出完整備份。

每個部署路徑都有自己的瀏覽器儲存 namespace。例如同一個 GitHub 帳號下的 `https://user.github.io/Travel-OS/` 與 `https://user.github.io/Travel-OS-Test/`，不會共用旅程、Firebase/Maps 設定或 onboarding 狀態。這可避免從 Template 建立另一個 repository 時誤讀同一個 `github.io` origin 上其他 Travel OS 的資料。

早期 beta 曾使用未分 deployment path 的共用 `travel-os` IndexedDB。因為舊資料本身沒有記錄它原本屬於哪一個 repository，更新後不會自動把這批舊資料搬進新的 namespace，以免再次造成跨 repository 資料混用。

Firebase 模式只在自行部署的版本開放，並是 self-host 第一次使用的主要 onboarding 路徑；只連線到使用者在設定精靈提供的專案。旅程以 `tripId` 儲存，讀寫權限依 membership 與已登入 UID 判定。切換模式或專案時，現有 adapter 會登出並停止使用舊連線；不同專案的資料不合併。官方公開體驗站會清除先前記住的雲端連線設定並停用相關欄位。

## 記住這台裝置

啟用後只在 localStorage 保存 Firebase 公開 Web config 與受限制的 Google Maps Browser Key。密碼不保存，也不會放入網址、repository 或作者的服務。Browser Key 並非真正秘密，所以安全依賴 Google Cloud 的 Website restrictions、API restrictions 與 quota；公用裝置不應啟用「記住這台裝置」。

## 兩種匯出

- **完整備份**：包含旅程、備註、群組與金額，應視為私人資料保存。
- **分享副本**：移除備註、群組關聯與金額，仍可能包含地點、日期、航班或住宿名稱；分享前仍應自行檢查。

備份包含 `schemaVersion`。匯入時會限制檔案大小、驗證結構、重新正規化欄位並先顯示旅程與項目數量。確認後會取代目前本機模式的全部旅程；雲端模式不允許批次覆蓋。

目前 beta 不提供跨 schemaVersion 自動遷移，也不會自動去除分享副本中的地點與日期。
