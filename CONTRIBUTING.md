# Contributing

感謝協助改善 Travel OS。請先建立 Issue 描述問題或使用情境；小型錯字與明確修正可直接提出 Pull Request。

## 本機開發

```bash
npm ci
npm run dev
npm run check
```

修改 Firebase Rules 時，請安裝 Java 21 並執行：

```bash
npm run test:rules
```

## 提交要求

- 不提交真實旅程、姓名、訂單、帳號、截圖個資、Firebase 專案設定或 API key。
- 示例使用虛構且中性的地點、日期與金額。
- 維持本機模式可用；外部服務失敗時需提供明確降級。
- 新增資料欄位時更新 schema 驗證、備份測試與相關文件。
- Rules 變更需包含 owner、editor、viewer、陌生人及跨使用者索引測試。
- UI 變更需以鍵盤操作並檢查手機與桌面版面。

Commit 請保持單一目的，Pull Request 說明實際行為、風險與測試結果。
