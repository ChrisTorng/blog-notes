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
export function noteCard(note, { full = true } = {}) {
  const link = notePath(note.id)
  const date = note.published_at || note.created_at
  return `<article class="entry note"><div class="entry-meta"><time datetime="${htmlEscape(date)}">${htmlEscape(new Date(date).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short' }))}</time> <span class="type">隨筆</span></div>
${note.title ? `<h2><a href="${link}">${htmlEscape(note.title)}</a></h2>` : ''}
<div class="prose dark:prose-invert">${full ? renderMarkdown(note.markdown) : `<p>${htmlEscape(plainText(note.markdown).slice(0, 320))}</p>`}</div>
<div class="entry-foot"><span>${tagLinks(note)}</span><a class="permalink" href="${link}">永久連結</a></div></article>`
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
  const { page, pages, tag = '', siteUrl } = opts
  const filtered = tag ? ` · ${names.get(tag) || tag}` : ''
  return pageHtml({
    title: `隨筆${filtered}`,
    description: 'ChrisTorng 的近期隨筆、技術觀察與學習心得',
    canonical: `/notes/${page === 1 ? '' : `page/${page}/`}${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`,
    current: 'notes',
    siteUrl,
    body: `<div class="page-heading"><h1>隨筆 <small>Notes</small></h1><p>學習、觀察與思考的短篇記錄。</p><div class="filters"><a href="/notes/" ${!tag ? 'aria-current="page"' : ''}>全部主題</a>${allTags.map((t) => `<a href="/notes/?tag=${t.id}" ${tag === t.id ? 'aria-current="page"' : ''}>${htmlEscape(t.displayName)}</a>`).join('')}</div></div><div class="entries">${notes.length ? notes.map((n) => noteCard(n)).join('') : '<p>目前沒有隨筆。</p>'}</div>${pager('/notes/', page, pages, tag)}`,
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
    body: `<p class="back"><a href="/notes/">← 隨筆列表</a></p><h1 class="note-heading">${htmlEscape(title)}</h1>${noteCard(note)}`,
  })
}
export function editorPage() {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>編輯隨筆</title><link rel="stylesheet" href="/notes/editor.css"></head><body>
<main class="workspace">
<header class="toolbar"><h1>隨筆 <small>Notes</small></h1><a href="/notes/">瀏覽隨筆 ↗</a><div class="note-picker"><label class="sr-only" for="noteSelect">選擇已存在的隨筆</label><select id="noteSelect"><option value="">新增隨筆</option></select><button id="newNote" type="button">新增</button></div><span id="authStatus" role="status"></span><button id="toggleAuth" type="button" aria-controls="auth" aria-expanded="false">本機登入</button></header>
<section id="auth" class="auth-bar" hidden><label for="localToken">本機開發 Token</label><input id="localToken" type="password" autocomplete="off"><button id="saveToken" type="button">登入</button></section>
<div class="title-row"><label for="title">標題</label><input id="title" maxlength="160" placeholder="選填；留白時取內文第一行"></div>
<div class="split-view"><section class="markdown-pane"><label for="markdown">Markdown</label><textarea id="markdown" spellcheck="false" maxlength="30000" placeholder="寫下一點想法……"></textarea></section><section class="preview-pane" aria-label="即時預覽"><div class="pane-label">即時預覽</div><h1 id="previewTitle"></h1><div id="preview" class="prose dark:prose-invert"></div></section></div>
<footer class="action-bar"><fieldset class="tag-select"><legend class="sr-only">主題標籤</legend>${allTags.map((t) => `<label><input type="checkbox" class="tag-check" value="${t.id}"> ${htmlEscape(t.displayName)}</label>`).join('')}</fieldset><label class="sr-only" for="status">發布狀態</label><select id="status"><option value="draft">草稿</option><option value="published">公開發布</option></select><button id="saveBtn" class="primary" type="button">儲存</button><button id="deleteBtn" class="danger" type="button" disabled>刪除</button><p id="message" role="status" aria-live="polite"></p></footer>
</main><script type="module" src="/notes/editor.js"></script></body></html>`
}
