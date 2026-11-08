# Google Pages 部署與拒絕流程驗證

日期：2026-11-09。使用[獨立驗收網站](https://fishingwithbag.github.io/travel-os-onboarding-acceptance-20261106/)，沒有修改原旅遊網站、來源 main 或計費方案。

## 已確認

- 帳號持有人完成 GitHub 再次驗證，畫面顯示 `Secret updated.`，新 Repo 的 `TRAVEL_OS_SITE_CONFIG` 已更新。
- [Pages run 42504400549](https://github.com/fishingwithbag/travel-os-onboarding-acceptance-20261106/actions/runs/42504400549) 成功，來源為包含分組停車修正的 `ecb61f6`。
- 網站重整後套用建立者提供的 Google Key，不要求旅伴貼 Key。實際東京站 → 上野站估算沒有顯示「未設定 Key」，而是嘗試服務後明確失敗並停止本批請求；手動行程未變更。
- Places 元件可載入，但實際搜尋 `Tokyo Station` 顯示搜尋無法完成與手動填寫提示，沒有虛構建議、距離或成功狀態。

這一輪是**正式站拒絕與降級證據**，尚非 Google 成功驗收。瀏覽器未提供可核對的原始 HTTP 狀態或 provider error code，因此不宣稱已觀察到 403、耗盡額度或確定的服務端拒絕碼。

## 網站限制問題

目前 Key 僅允許本機來源與指定 Repo 路徑，且保留 Maps JavaScript API、Places API (New)、Routes API 三項 API 限制。[Google 官方安全文件](https://developers.google.com/maps/api-security-best-practices#restricting-api-keys)明確提醒，多數瀏覽器會移除跨來源 `Referer` 的路徑，完整路徑限制需謹慎使用。

因此，Repo 路徑限制是本次待驗證的原因假設。帳號持有人已明確拒絕擴大至整個 hostname；已取消修改並重新讀取控制台確認較廣範圍未保存。保留現有來源與三項 API 限制，後續改評估獨立 hostname 的隔離方案。Google 成功驗收仍未通過，不能因官方說明而把原因假設當作已證實。

Step 3 與公開 Google 指南已補上協定／hostname 範例、路徑限制的陷阱、同 hostname 的涵蓋範圍及獨立來源／專用 Key 的隔離選項；Step 1、2 未變更。這些說明不把 SDK 載入成功當作搜尋／估算完成。

## 仍待驗證

- 選定獨立 hostname 的隔離方案後，驗證 Places 選取與 Routes 真實成功；不擴大現有 hostname 範圍。
- 獨立登入及前次自建／還原旅程讀回已通過，見[雲端讀回報告](VERIFICATION_CLOUD_READBACK_2026-11-09.zh-TW.md)。
- 第二專案切換、跨裝置、正式站完整離線及最終發布門檻仍依[發布清單](RELEASE_ACCEPTANCE.zh-TW.md)保留，不因部署成功而勾選完成。

本機 181 項單元、Rules 產生一致性及 production build 通過。Google Key 沒有寫入來源 repository、PR 或本報告。
