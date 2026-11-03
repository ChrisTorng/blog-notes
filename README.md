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
