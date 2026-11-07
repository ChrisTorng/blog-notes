# Public Website And RSS Consistency

This repository owns Notes persistence, APIs, dynamic permalink HTML and RSS generation. The canonical **public UI** (desktop and mobile) lives in [ChrisTorng/christorng.github.io](https://github.com/ChrisTorng/christorng.github.io). Its public `components/ListWithCategories.tsx`, `components/notes`, `components/bookmarks` and shared styles define layout, visual styles, mobile breakpoints, category sidebar/selector, typography, spacing, links and navigation. Do not independently change public-facing styles here: reconcile changes with the main site's source first. Private management/editor UI is exempt.

Before any change to public routes, category or page names, feed semantics or publication dates, compare [blog-bookmarks](https://github.com/ChrisTorng/blog-bookmarks) and the main repo and keep all three consistent. `shared/ListWithCategories.tsx` and its generated `.js` are integration snapshots, not a separate source of visual truth. Changes must be synchronized through the main repository; keep generated code current via `npm run build:shared` if source is edited.

## Names And Feeds

- Visible list headings are `隨筆` (root) and `{category} · 隨筆` (filtered); root category selector is `所有隨筆`.
- The visible RSS label is `所有隨筆 RSS` or `{category} · 隨筆 RSS`. The XML channel `<title>` appends ` | ChrisTorng 學習天地` (the same separator used by HTML titles). Combined article-and-Notes feeds use `所有文章與隨筆 RSS` or `{category} · 文章與隨筆 RSS`.
- RSS `<item><link>` goes to the public on-site note/article, not an unrelated external source. Keep stable GUIDs and actual publication timestamps for Notes; do not invent new seconds where stored timestamps exist.
- Check both desktop and mobile public presentation after source or integration updates; compare category heading, list, navigation, RSS link, title, original content and responsive behavior across the three site sections.

## Complete public content parity

- Published permalink `/notes/<slug>/`, `/notes/feed.xml` and combined feed use `src/public-content.js#noteArticleHtml` for complete Markdown-rendered note content, source/reference links, publication date and localized tags. Do not separately construct shortened or plain-text versions of that HTML. `description` contains escaped HTML and `content:encoded` uses safe CDATA.
- Main-site public `NotePublicItem` owns the reference list/detail React presentation; the Worker `publicNotePage` inserts the matching HTML into the shared `/notes-shell/` layout. Compare both on mobile, desktop and dark mode. Resolve relative Markdown links consistently via `renderPublicMarkdown`.
