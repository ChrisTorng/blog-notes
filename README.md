# 隨筆 / Notes

Workers Static Assets + D1 的 Markdown 隨筆系統，提供 `/notes/api/*`、管理介面及公開內容的伺服器渲染。

## 外觀與責任分工

- 主站提供 `/notes-shell/` 共用版型，包含既有 CSS、字型、Header、Footer、搜尋及深淺色切換。隨筆不複製網站樣式。
- Worker 將公開隨筆 HTML 和 SEO metadata 填入主站內容區，保留伺服器輸出及靜態主站架構。版型無法取得時回應 503。
- 管理介面使用獨立 CSS：桌機左右編輯／即時預覽，手機上下排列，含標題、分類、草稿／發布及儲存操作。
- 主站草稿列表合併文章與隨筆草稿。隨筆草稿只能經已驗證的管理 API 讀取，不寫入靜態 JSON。

公開頁使用完整頁面導覽，避免將 Worker HTML 當成 Next.js RSC 回應；主站其他路由維持 Next.js 導覽。

## 本機啟動

需要 Node.js 22+，此 repo 與主站 repo 放在同一層。

在 `blog-notes` 目錄的第一個 PowerShell：

```powershell
npm ci
.\scripts\setup-local.ps1
npm run db:migrate
npm run dev
```

第二個 PowerShell，可使用主站已提交版本的隔離副本：

```powershell
.\scripts\start-blog-isolated.ps1
```

或安裝整合後啟動原主站：

```powershell
node .\integration\install-blog.mjs ..\christorng.github.io
cd ..\christorng.github.io
npm run start
```

不要同時啟動兩個主站，也不要在 Next.js dev 運作時執行正式 build。

| 網址                                       | 功能             |
| ------------------------------------------ | ---------------- |
| `http://localhost:3000/notes/`             | 隨筆列表         |
| `http://localhost:3000/notes/editor/`      | Markdown 編輯器  |
| `http://localhost:3000/notes/all/`         | 文章與隨筆時間軸 |
| `http://localhost:3000/draft/`             | 文章與隨筆草稿   |
| `http://localhost:3000/notes/feed.xml`     | 隨筆 RSS         |
| `http://localhost:3000/notes/all/feed.xml` | 混合 RSS         |
| `http://localhost:3000/notes/sitemap.xml`  | 隨筆 Sitemap     |

本機 Token 位於 `.dev.vars`，D1 狀態在 `.wrangler/state/`。本機設定、資料庫、診斷報告和截圖均不納入版本控制。

`BLOG_SHELL_URL` 指向主站 `/notes-shell/`，`BLOG_INDEX_URL` 指向完整文章索引。索引失效時以 `BLOG_FEED_URL` 備援並警示。公開外觀應經主站網址預覽；8787 埠主要供 Worker／API 測試。

## API 與資料

所有 API 位於 `/notes/api/*`；管理 API 位於 `/notes/api/admin/*`。公開 API 僅傳回已發布內容。

寫入格式：`{ "title": "選填", "markdown": "內容", "status": "draft", "tags": ["ai"] }`。狀態為 `draft` 或 `published`。

ID 是 UTC 建立日期 `YYYYMMDD`、連字號、10 位隨機十六進位字元；隨機部分不包含小時資訊。未填標題時從第一個非空白 Markdown 行擷取文字，保留文字中的 `<`、`>`。RSS 上限 100 筆，Sitemap 包含全部已發布隨筆。

## 驗證

兩個服務啟動後：

```powershell
npm run check
npm run test:integration
$env:TEST_BASE_URL='http://localhost:3000'
npm run test:integration
.\scripts\smoke-test.ps1 -BaseUrl http://localhost:3000
Remove-Item Env:TEST_BASE_URL
```

整合測試僅允許 localhost，建立的測試資料會自行清除。不要將個人路徑、私有資料或個別環境的操作紀錄寫入 repo。

## 正式環境

管理頁與 API 使用 Cloudflare Access，驗證 RS256 簽章、issuer、audience、期限及指定 Email；未設定時預設拒絕。本機 Token 僅限 localhost。

正式部署前需要真實 D1 ID、Access 設定、發布主站共用版型及索引，並另行驗證 static export、Access 登入與 Kit RSS。此 repo 沒有自動部署；本機開發不修改正式 Route 或遠端資料庫。
