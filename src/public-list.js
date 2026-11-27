import { allTags, listNotes, pageNumber, noteTagCounts } from './data.js'
import { htmlEscape as esc, notePath, noteTitle } from './markdown.js'
import { noteArticleHtml } from './public-content.js'
import { bookmarkEmbeds } from './bookmark-embed.js'

// Public list SSR: no JavaScript is required for crawlers or readers to see
// the complete note Markdown, titles, tags and permanent links.
export async function publicNotesList(req, env) {
  const url = new URL(req.url)
  const tag = url.searchParams.get('tag') || ''
  const page = pageNumber(url.searchParams.get('page'))
  const [data, counts] = await Promise.all([
    listNotes(env.DB, { tag, page }),
    noteTagCounts(env.DB),
  ])
  const embeds = await bookmarkEmbeds(data.items, env, url.origin, {showReading:false})
  const active = allTags.find(t => t.id === tag)
  const label = active ? active.displayName + ' · 隨筆' : '隨筆'
  const buildLink = (nextTag, nextPage = 1) => {
    const p = new URLSearchParams()
    if (nextTag) p.set('tag', nextTag)
    if (nextPage > 1) p.set('page', String(nextPage))
    return '/notes/' + (p.size ? '?' + p.toString() : '')
  }
  const cards = data.items.map(note => {
    const html = noteArticleHtml(note,url.origin,embeds[note.bookmark_id] || '')
    // The article renderer intentionally shares the RSS contract, so add an
    // explicit discoverable local URL outside it rather than copying fields.
    const permalink = '<p class="text-sm text-primary-500"><a href="' +
      esc(notePath(note)) + '">隨筆永久連結：' + esc(noteTitle(note)) + '</a></p>'
    return html + permalink
  }).join('')
  const tagLinks = allTags.map(t => {
    const selected = tag === t.id
    return '<a class="block rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ' +
      (selected ? 'bg-gray-100 font-bold text-primary-500 dark:bg-gray-800' : '') +
      '" href="' + esc(buildLink(t.id)) + '">#' + esc(t.displayName) +
      ' <small class="text-gray-500">(' + Number(counts[t.id] || 0) + ')</small></a>'
  }).join('')
  const pageLinks = data.pages > 1 ?
    '<nav aria-label="分頁" class="mt-6 flex items-center justify-between gap-3 text-sm">' +
    (page > 1 ? '<a class="text-primary-500" href="' + esc(buildLink(tag,page-1)) +
      '">← 上一頁</a>' : '<span></span>') +
    '<span>' + data.page + ' / ' + data.pages + '</span>' +
    (page < data.pages ? '<a class="text-primary-500" href="' + esc(buildLink(tag,page+1)) +
      '">下一頁 →</a>' : '<span></span>') + '</nav>' : ''
  const body = '<section class="w-full py-5 pb-12">' +
    '<header class="mb-6 flex flex-wrap items-start justify-between gap-4">' +
    '<div><h1 class="heading-accent text-3xl font-extrabold sm:text-5xl">' + esc(label) +
    ' <small class="ml-2 text-lg font-normal text-gray-500">Notes</small></h1>' +
    '<p class="mt-3 text-gray-500 dark:text-gray-400">個人隨筆、觀察與學習心得</p></div>' +
    '<a class="text-primary-500 text-sm" href="/notes/feed.xml' +
    (tag ? '?tag=' + encodeURIComponent(tag) : '') + '" type="application/rss+xml">隨筆 RSS</a></header>' +
    '<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-[244px_minmax(0,1fr)] lg:gap-12">' +
    '<aside class="hidden md:block"><a class="mb-2 block font-bold text-primary-500" href="/notes/">所有隨筆 (' +
    Number(data.total) + ')</a><nav class="space-y-1" aria-label="隨筆分類">' + tagLinks + '</nav></aside>' +
    '<div class="min-w-0"><form action="/notes/" method="get" class="mb-2 md:hidden">' +
    '<label>分類 <select name="tag" class="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:bg-gray-800">' +
    '<option value="">所有隨筆</option>' + allTags.map(t => '<option value="' + esc(t.id) +
      '"' + (tag === t.id ? ' selected' : '') + '>' + esc(t.displayName) + '</option>').join('') +
    '</select></label><button type="submit" class="ml-2 rounded bg-primary-500 px-3 py-1 text-sm text-white">篩選</button></form>' +
    (cards || '<p class="py-6 text-gray-500">目前沒有隨筆。</p>') + pageLinks +
    '</div></div></section>'
  const shell = await fetch(env.BLOG_SHELL_URL || url.origin + '/notes-shell/', {headers:{Accept:'text/html'}})
  if (!shell.ok) return new Response('網站版型暫時無法取得', {status:503,headers:{'Cache-Control':'no-store'}})
  const meta = '<meta name="description" content="ChrisTorng 的隨筆，包含完整文章內容與引用書籤">' +
    '<meta name="robots" content="' + (url.searchParams.size ? 'noindex,follow' : 'index,follow') + '">' +
    '<link rel="canonical" href="' + esc(url.origin + '/notes/') + '">'
  let rewrite = new HTMLRewriter()
    .on('#notes-content',{element(el){el.setInnerContent(body,{html:true})}})
    .on('title',{element(el){el.setInnerContent(label + ' | ChrisTorng 學習天地')}})
    .on('head',{element(el){el.append(meta,{html:true})}})
  for (const selector of ['meta[name="description"]','meta[name="robots"]','link[rel="canonical"]'])
    rewrite = rewrite.on(selector,{element(el){el.remove()}})
  const headers = new Headers(shell.headers)
  headers.set('Content-Type','text/html; charset=utf-8')
  headers.set('Cache-Control','no-store') // Set cache policy only in PublicCache.
  headers.delete('Content-Length')
  return rewrite.transform(new Response(shell.body,{status:200,headers}))
}
