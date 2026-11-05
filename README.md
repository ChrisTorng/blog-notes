## 架構分工（2026-11-05）

本 repo 的 Cloudflare Worker 僅處理 `/notes/api*`（D1／Access 管理 API）、`/notes/feed.xml*`、`/notes/all/feed.xml*`、`/notes/sitemap.xml*`（資料輸出）。隨筆列表、詳情、編輯器及 HTML/JS/CSS 已移至 `ChrisTorng/christorng.github.io` GitHub Pages；純 UI 修改不部署 Worker。Markdown 預覽屬受驗證的 JSON API 格式轉換，公開閱讀 Markdown 在瀏覽器渲染。既有 D1 與歷史 Migration 保留；正式部署絕不自動重跑一次性 Migration。舊 SSR 版型檔暫存作遷移參考，不是 Worker 執行入口。

# blog-notes

Markdown notes for <https://christorng.idv.tw/notes/>. Cloudflare Worker + D1; editor at /notes/editor/.

## Local development

From ../christorng.github.io, run `npm run start:all` to open all five services in separate terminal tabs. See the [main README](../christorng.github.io/README.md) for service relationships and troubleshooting.

To run only Notes after setup:

```powershell
npm run db:migrate
npm run dev
```

The Worker listens on 127.0.0.1:8787. Browse through http://localhost:3000/notes/; the main site must be running. Sign in with LOCAL_ADMIN_TOKEN from .dev.vars. Local data lives in .wrangler/state/.

For manual first-time setup: `npm ci`, then `./scripts/setup-local.ps1`, followed by the commands above. The main launcher handles these steps automatically.

## Integration

- Main site /notes-shell/ supplies public page layout and styles.
- /articles-index.json supplies articles for the combined timeline; /feed.xml is the fallback.
- /notes/feed.xml is Notes RSS; /notes/all/feed.xml combines articles and notes.
- /draft/ combines article and note drafts. The editor exports saved notes as Markdown ZIP.
- Bookmark references are stored with the note; Bookmarks uses its own D1 database.
- Categories in shared/tags.json must match the main site's data/tagDefinitions.ts.

After changing integration templates, apply them to the main site and review the diff:

```powershell
node integration/install-blog.mjs ../christorng.github.io
```

Installation is not needed for normal startup. Shared list source: shared/ListWithCategories.tsx; keep its integration copy synchronized. `npm run build:shared` generates the Worker module and runs automatically before dev, tests, and deployment.

## Checks and deployment

```powershell
npm run check
# With the main site and Notes running:
$env:TEST_BASE_URL = 'http://localhost:3000'
npm run test:integration
Remove-Item Env:TEST_BASE_URL
```

Production Worker and D1: blog-notes; routes and Access settings: wrangler.jsonc. Admin pages/API require Cloudflare Access; ACCESS_ALLOWED_EMAIL is a Worker secret. Deploy with `npm run deploy`; apply new production migrations separately with `npx wrangler d1 migrations apply DB --remote`.
