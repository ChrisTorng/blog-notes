# 隨筆 / Notes

`ChrisTorng/blog-notes`：Cloudflare Workers Static Assets + D1 的 Markdown 隨筆系統。所有 JSON API 位於 `/notes/api/*`。公開頁面由 Worker 輸出完整 HTML，管理操作使用 Cloudflare Access JWT。

## Windows 本機啟動

Node.js 22+，本次實測 Node.js 24.9.0、npm 11.6.0、Wrangler 4.153.0。

第一個 PowerShell：

```powershell
cd D:\Projects\GitHub\ChrisTorng\blog-notes
npm ci
.\scripts\setup-local.ps1
npm run db:migrate
npm run dev
```

第二個 PowerShell（使用原 blog 已提交版本的隔離副本；不包含未提交文章）：

```powershell
cd D:\Projects\GitHub\ChrisTorng\blog-notes
.\scripts\start-blog-isolated.ps1
```

原 blog 本身可正常啟動時，也可直接使用原資料夾：

```powershell
cd D:\Projects\GitHub\ChrisTorng\blog-notes
node .\integration\install-blog.mjs ..\christorng.github.io
cd ..\christorng.github.io
npm run start
```

請勿同時啟動兩個 blog。沿用原 blog 的規則：開發伺服器運作時不可執行正式 build，也不可刪除 `.next` 或 `.contentlayer`。

| 網址                                       | 功能                              |
| ------------------------------------------ | --------------------------------- |
| `http://localhost:3000/notes/`             | 隨筆，20 筆分頁及主題篩選         |
| `http://localhost:3000/notes/editor/`      | Markdown 管理與預覽               |
| `http://localhost:3000/notes/all/`         | 全部已發布文章 + 隨筆，依時間排序 |
| `http://localhost:3000/notes/feed.xml`     | 最近 100 筆已發布隨筆 RSS         |
| `http://localhost:3000/notes/all/feed.xml` | 最近 100 筆混合 RSS               |
| `http://localhost:3000/notes/sitemap.xml`  | 全部已發布隨筆 Sitemap            |
| `http://127.0.0.1:8787/notes/`             | Worker 獨立測試入口               |

開啟 `.dev.vars`，將 `LOCAL_ADMIN_TOKEN` 貼到本機編輯器登入。Token 只用於 localhost 開發；不應放入 Git。D1 資料存在 `.wrangler/state/`，不連線遠端資料庫。`setup-local.ps1` 不覆寫既有設定。

## 原 blog 整合

`integration/install-blog.mjs` 對 `christorng.github.io` 加入三個可檢閱的變更：

1. `next.config.js`：僅 development 增加 `/notes/:path*` 到 `127.0.0.1:8787` 的代理。
2. `data/headerNavLinks.ts`：僅 development 顯示「隨筆」及「全部」。
3. `app/articles-index.json/route.ts`：輸出完整已發布文章的靜態 JSON 索引，適用既有 static export；不包含草稿。這是靜態資料檔，管理 API 仍全部位於 `/notes/api/*`。

Blog 的變更只留在本機，沒有 commit/push 原 blog，也沒有觸發正式部署。隔離副本在 `.local/blog/`，重用原 blog 的 node_modules，但有自己的 `.next`、`.contentlayer`。請勿在隔離副本使用 git 提交。

`BLOG_INDEX_URL` 預設指向本機 blog 的 `/articles-index.json`；完整索引失效時改讀 `BLOG_FEED_URL` 並顯示警示。原 blog RSS 僅 20 篇，備援模式的歷史範圍因此受限。兩個來源均失效時顯示隨筆並提示，混合 RSS 回應 503，避免讓訂閱服務把不完整內容當成成功更新。

## 測試

兩個伺服器啟動後：

```powershell
cd D:\Projects\GitHub\ChrisTorng\blog-notes
npm run check
npm run test:integration
$env:TEST_BASE_URL='http://localhost:3000'
npm run test:integration
.\scripts\smoke-test.ps1 -BaseUrl http://localhost:3000
Remove-Item Env:TEST_BASE_URL
```

整合測試僅允許 localhost，建立 106 筆測試隨筆，結束時只刪除自己建立的資料。測試涵蓋授權拒絕、CRUD、草稿隔離、Markdown 預覽、安全 SSR、JSON-LD、HEAD、Static Assets、分頁、主題、RSS、完整 Sitemap、混合排序及跨頁不遺漏／重複。PowerShell 的已驗證管理 API URL 使用尾端斜線，避免 Next.js 重新導向時 .NET 移除 Authorization 標頭。

詳細實測紀錄見 [TEST-RESULTS.md](TEST-RESULTS.md)。

## API

| 方法               | 路徑                        | 功能               |
| ------------------ | --------------------------- | ------------------ |
| GET                | `/notes/api/?page=1&tag=ai` | 公開列表           |
| GET                | `/notes/api/:id`            | 單則已發布內容     |
| GET                | `/notes/api/tags`           | 主題定義           |
| GET                | `/notes/api/all?page=1`     | 混合時間軸         |
| GET / POST         | `/notes/api/admin/`         | 分頁管理列表／建立 |
| GET / PUT / DELETE | `/notes/api/admin/:id/`     | 管理單則           |
| POST               | `/notes/api/admin/preview`  | Markdown 預覽      |
| GET                | `/notes/api/admin/whoami`   | 管理者驗證狀態     |

寫入格式：`{ "title": "選填", "markdown": "內容", "status": "draft", "tags": ["ai"] }`。可用狀態為 `draft`、`published`，主題為 `future`、`ai`、`music`、`english`，鏡像原 blog 的主題定義。

## Cloudflare Access 與部署狀態

正式驗證會檢查 `Cf-Access-Jwt-Assertion` 的 RS256 簽章、issuer、audience、必要 claims、期限與指定 Email，不信任僅傳入的 Email 標頭。本機 Token 受 `AUTH_MODE=local` 和 localhost hostname 雙重限制。正式環境未設定 Access 時，管理頁與 API 預設拒絕。

未執行任何 Cloudflare 部署、遠端 migration、DNS、Route、Access policy 或 Kit 變更。正式部署前仍需要：

- 真實 D1 database_id（目前為本機用範例 UUID）。
- `ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com`、`ACCESS_AUD`、`ACCESS_ALLOWED_EMAIL`。
- Access 保護 `/notes/editor`、`/notes/editor/*`、`/notes/api/admin`、`/notes/api/admin/*`，保持公開頁與 RSS 可讀。
- 先發布 blog 靜態文章索引，再於明確要求下部署 Worker 及設定 `/notes/*` 正式路由。
- 雲端 Access OTP、真實 JWKS、手機登入／登出與 Kit RSS 抓取測試。

已以本機 RSA 金鑰測試 JWT 驗證，但不代表已測通雲端 Access 登入流程。

參考：[D1 本機開發](https://developers.cloudflare.com/d1/best-practices/local-development/)、[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[Access JWT 驗證](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。
