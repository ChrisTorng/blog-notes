import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ListWithCategories, {
  formatNoteDate,
} from '../shared/list-with-categories.js'
import MarkdownIt from 'markdown-it'
import { allTags } from './data.js'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})
const names = new Map(allTags.map((tag) => [tag.id, tag.displayName]))
export const htmlEscape = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(
      /[&<>"']/g,
      (ch) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[ch]
    )
export function renderMarkdown(input) {
  return md.render(String(input ?? ''))
}
export function plainText(markdown) {
  const text = []
  function visit(tokens) {
    for (const token of tokens) {
      if (token.children) visit(token.children)
      else if (
        ['text', 'code_inline', 'code_block', 'fence'].includes(token.type)
      )
        text.push(token.content)
      else if (token.type === 'image') text.push(token.content)
      else if (
        token.type === 'softbreak' ||
        token.type === 'hardbreak' ||
        token.block
      )
        text.push(' ')
    }
  }
  visit(md.parse(String(markdown ?? ''), {}))
  return text.join('').replace(/\s+/g, ' ').trim()
}
export function noteTitle(note) {
  return (
    note.title ||
    plainText(
      String(note.markdown)
        .split(/\r?\n/)
        .find((line) => line.trim()) || ''
    ).slice(0, 160) ||
    '隨筆'
  )
}
export function notePath(id) {
  return `/notes/${encodeURIComponent(id)}/`
}
export function pageHtml({
  title,
  description = '',
  canonical,
  body,
  head = '',
  current = '',
  feed = true,
  siteUrl = 'https://christorng.idv.tw',
  robots = 'index,follow',
  type = 'website',
}) {
  const url = canonical ? new URL(canonical, siteUrl).href : `${siteUrl}/notes/`
  const desc = String(description || 'ChrisTorng 學習天地的隨筆').slice(0, 180)
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${htmlEscape(title)} | ChrisTorng 學習天地</title><meta name="description" content="${htmlEscape(desc)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${htmlEscape(url)}"><meta property="og:type" content="${type}"><meta property="og:title" content="${htmlEscape(title)}"><meta property="og:description" content="${htmlEscape(desc)}"><meta property="og:url" content="${htmlEscape(url)}">${feed ? '<link rel="alternate" type="application/rss+xml" title="隨筆 RSS" href="/notes/feed.xml">' : ''}${head}</head><body><main>${body}</main></body></html>`
}
export function tagLinks(note) {
  return (note.tags || [])
    .map(
      (id) =>
        `<a class="tag" href="/notes/?tag=${encodeURIComponent(id)}">${htmlEscape(names.get(id) || id)}</a>`
    )
    .join(' ')
}
export function noteCard(note, { showTitle = true } = {}) {
  const link = notePath(note.id)
  const date = note.published_at || note.created_at
  return `<article class="entry note" data-note-id="${htmlEscape(note.id)}"><div class="entry-meta"><time datetime="${htmlEscape(date)}">${htmlEscape(formatNoteDate(date))}</time></div>
${showTitle && note.title ? `<h2><a class="title-link" href="${link}">${htmlEscape(note.title)}</a></h2>` : ''}
<div class="entry-tags">${tagLinks(note)}</div>
<div class="prose dark:prose-invert">${renderMarkdown(note.markdown)}</div>
</article>`
}
export function articleCard(item) {
  return `<article class="entry article"><div class="entry-meta"><time datetime="${htmlEscape(item.date)}">${htmlEscape(new Date(item.date).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }))}</time> <span class="type">文章</span></div><h2><a href="${htmlEscape(item.url)}">${htmlEscape(item.title)}</a></h2><p class="summary">${htmlEscape(item.summary).slice(0, 550)}</p><a href="${htmlEscape(item.url)}">閱讀文章</a></article>`
}
export function pager(base, page, pages, tag = '') {
  const suffix = tag ? `?tag=${encodeURIComponent(tag)}` : ''
  const href = (n) => `${base}${n === 1 ? '' : `page/${n}/`}${suffix}`
  return `<nav class="pager" aria-label="分頁">${page > 1 ? `<a href="${href(page - 1)}">← 上一頁</a>` : '<span></span>'}<span>第 ${page} / ${pages} 頁</span>${page < pages ? `<a href="${href(page + 1)}">下一頁 →</a>` : '<span></span>'}</nav>`
}
export function listingPage(notes, opts) {
  const { page, pages, tag = '', siteUrl, tagCounts = {} } = opts
  const filtered = tag ? ' · ' + (names.get(tag) || tag) : ''
  const categories = allTags.map((t) => ({
    ...t,
    count: tagCounts[t.id] || 0,
    href: '/notes/?tag=' + encodeURIComponent(t.id),
  }))
  const feedPath =
    '/notes/feed.xml' + (tag ? '?tag=' + encodeURIComponent(tag) : '')
  const body = renderToStaticMarkup(
    createElement(ListWithCategories, {
      posts: notes.map((note) => ({
        path: note.id,
        href: notePath(note.id),
        date: note.published_at || note.created_at,
        title: noteTitle(note),
        html: renderMarkdown(note.markdown),
        tags: note.tags.map((t) => names.get(t) || t),
        noteId: note.id,
      })),
      title: '隨筆' + filtered,
      categories,
      activeTag: tag,
      rootHref: '/notes/',
      rootLabel: '所有隨筆',
      rootActive: !tag,
      rssHref: feedPath,
      rssTitle: '隨筆' + filtered + ' RSS',
      pagination: {
        totalPages: pages,
        currentPage: page,
        basePath: 'notes',
        hrefForPage: (n) =>
          '/notes/' +
          (n === 1 ? '' : 'page/' + n + '/') +
          (tag ? '?tag=' + encodeURIComponent(tag) : ''),
      },
    })
  )
  return pageHtml({
    title: '隨筆' + filtered,
    description: 'ChrisTorng 的近期隨筆、技術觀察與學習心得',
    canonical:
      '/notes/' +
      (page === 1 ? '' : 'page/' + page + '/') +
      (tag ? '?tag=' + encodeURIComponent(tag) : ''),
    current: 'notes',
    siteUrl,
    body,
  })
}
export function individualPage(note, siteUrl) {
  const title = noteTitle(note),
    description = plainText(note.markdown)
  const date = note.published_at || note.created_at
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    author: { '@type': 'Person', name: 'ChrisTorng' },
    datePublished: date,
    dateModified: note.updated_at,
    mainEntityOfPage: new URL(notePath(note.id), siteUrl).href,
    description: description.slice(0, 180),
  }).replace(/</g, () => String.fromCharCode(92) + 'u003c')
  return pageHtml({
    title,
    description,
    canonical: notePath(note.id),
    siteUrl,
    type: 'article',
    current: 'notes',
    head: `<script type="application/ld+json">${jsonld}</script>`,
    body: `<p class="back"><a href="/notes/">← 隨筆列表</a></p><h1 class="note-heading">${htmlEscape(title)}</h1>${noteCard(note, { showTitle: false })}`,
  })
}
export function editorPage() {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>編輯隨筆</title><link rel="stylesheet" href="/notes/editor.css"></head><body>
<main class="workspace" id="workspace" aria-busy="false">
<header class="toolbar"><h1>隨筆 <small>Notes</small></h1><a href="/notes/">瀏覽隨筆 ↗</a><div class="note-picker"><label for="noteSelect">歷史隨筆</label><select id="noteSelect" aria-label="選擇已存在的隨筆"></select><button id="newNote" type="button">新增</button></div><button id="exportNotes" type="button" disabled title="下載所有已儲存的隨筆，包含草稿，每則一個 Markdown 檔">匯出全部 .md</button><span id="authStatus" role="status"></span><button id="toggleAuth" type="button" aria-controls="auth" aria-expanded="false">本機登入</button></header>
<section id="auth" class="auth-bar" hidden><label for="localToken">本機開發 Token</label><input id="localToken" type="password" autocomplete="off"><button id="saveToken" type="button">登入</button></section>
<div class="split-view"><section class="compose-pane" aria-label="編輯"><div class="pane-label">編輯</div><div class="title-field"><label class="sr-only" for="title">標題</label><input id="title" maxlength="160" placeholder="標題（選填；留白時取內文第一行）"></div><label class="body-label" for="markdown">內文（Markdown）</label><textarea id="markdown" spellcheck="false" maxlength="30000" placeholder="寫下一點想法……"></textarea></section>
<section class="preview-pane" aria-label="即時預覽"><div class="pane-label">即時預覽</div><div class="title-field"><h1 id="previewTitle"></h1></div><div class="body-label" aria-hidden="true">內文</div><div id="preview" class="prose"></div></section></div>
<footer class="action-bar"><fieldset class="tag-select"><legend class="sr-only">主題標籤</legend>${allTags.map((t) => `<label><input type="checkbox" class="tag-check" value="${t.id}"> ${htmlEscape(t.displayName)}</label>`).join('')}</fieldset><span id="noteStatus">新增</span><button id="saveDraftBtn" type="button">儲存為草稿</button><button id="publishBtn" class="primary" type="button">立即發佈</button><button id="deleteBtn" class="danger" type="button" disabled>刪除</button><p id="message" role="status" aria-live="polite"></p></footer>
</main><dialog id="unsavedDialog" aria-labelledby="unsavedHeading" aria-describedby="unsavedAction"><form method="dialog"><h2 id="unsavedHeading">尚未儲存</h2><p id="unsavedAction"></p><div class="dialog-actions"><button value="cancel" autofocus>繼續編輯</button><button value="discard" class="danger">放棄並繼續</button></div></form></dialog><script type="module" src="/notes/editor.js"></script></body></html>`
}
