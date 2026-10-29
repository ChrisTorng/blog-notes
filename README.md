# 隨筆 / Notes

Workers Static Assets + D1 的 Markdown 隨筆系統，提供 `/notes/api/*`、管理介面及公開內容的伺服器渲染。

## 外觀與責任分工

- 主站提供 `/notes-shell/` 共用版型，包含既有 CSS、字型、Header、Footer、搜尋及深淺色切換。隨筆不複製網站樣式。
- Worker 將公開隨筆 HTML 和 SEO metadata 填入主站內容區，保留伺服器輸出及靜態主站架構。版型無法取得時回應 503。
- 管理介面使用獨立 CSS：桌機左右編輯／即時預覽，手機上下排列，左側標題與內文對應右側預覽，提供「儲存為草稿」「立即發佈」。新增、切換及離開前檢查未儲存內容。
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

歷史清單按草稿／已發佈分組並顯示時間；新增由獨立按鈕處理。選取或儲存項目後網址包含該 ID。公開頁只有經 `/notes/api/session` 驗證的管理者才會看到編輯連結；連結本身不取代管理 API 的權限驗證。

首頁與類別頁合併文章與已發佈隨筆。已發佈項目顯示「更新發佈」及「退回草稿」；退回草稿需確認，確認後會自公開頁、RSS、Sitemap 移除。舊的 `/notes/all/` 瀏覽網址轉向首頁，混合 RSS 路徑維持相容。

## 上線前預備階段

主站的 data/notesSettings.ts 以單一開關控制正式露出，目前 productionNotesDiscoveryEnabled 為 false。本機開發仍顯示隨筆；正式首頁與類別使用原文章版型且不呼叫隨筆 API，導覽不顯示隨筆。草稿頁、共用版型與已知隨筆網址獨立保留。只有在線上路由、資料庫、驗證與 SEO 測通之後，才另行修改開關公開。這是露出控制，不是存取限制。

## 隨筆列表與分頁

文章與隨筆使用相同的 ListWithCategories 元件與主站 CSS。隨筆側欄顯示各類別的已發佈筆數；日期使用與文章相同的數字年月日格式，隨筆另加台北時間的時分，例如 2026/10/28 19:18；文章維持只有日期。每頁 20 筆，超過一頁才顯示分頁控制，切頁保留目前類別。

共用元件原始碼在 shared/ListWithCategories.tsx；npm run build:shared 產生 Worker 使用的 JavaScript。dev、check、test 與 deploy 前會自動產生。主站透過 integration/blog/components/ListWithCategories.tsx 使用相同原始碼；更新元件時一併同步整合檔。

## 匯出所有隨筆

登入管理頁後，按工具列的「匯出全部 .md」，下載 ZIP。每則已儲存隨筆一個以 ID 命名的 .md，包含已發佈項目與草稿，不包含尚未儲存的編輯。

檔案沿用文章 YAML frontmatter：title、date、lastmod、tags、draft；內文維持原始 Markdown。另保留 note_id、created_at、published_at，方便辨識原始隨筆及時間。title 保存匯出當時的顯示標題；不產生 summary，發布狀態僅以 draft 表示。分類使用主站顯示名稱，草稿以 draft: true 表示。ZIP 以串流匯出所有批次，沒有管理清單每頁 100 筆的限制。

匯出端點為 GET /notes/api/admin/export，與其他管理 API 使用相同的登入驗證，回應不允許快取。匯出是備份，不會變更或刪除資料，也不會自動加入主站文章。

隨筆列表、詳細頁、混合時間軸及 RSS 一律提供全文，不使用摘要截斷。內文上限 30,000 字元，選填標題上限 160 字元；前端輸入、預覽與寫入 API 均維持此限制。
