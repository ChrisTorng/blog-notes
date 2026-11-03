# 書籤引用整合測試
- 書籤引用 ID 為 UUID，儲存於 Notes 的獨立欄位，不依賴跨 D1 外鍵。
- 從 `/bookmarks/admin/` 開啟 `/notes/editor/?bookmark=UUID`，引用書籤，初稿帶入原文 Markdown 連結、標題與摘要。
- 編輯器保留站內書籤詳細頁連結；已發佈 Notes 顯示同一書籤連結。
- 在本機先測試資料庫 Migration、公開頁與預覽後再正式部署。
