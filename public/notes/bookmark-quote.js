// A Markdown snapshot of a published Bookmarks entry, shared by the editor and tests.
// Keep this in sync with the main site's public/notes/bookmark-quote.js.
const inline = (value) =>
  String(value ?? '').replace(/\\/g, '\\\\').replace(/([\[\]*_\x60])/g, '\\$1').replace(/\r?\n/g, ' ')

function link(label, url) {
  const target = String(url || '').trim()
  if (!(/^https?:\/\//i.test(target) || (target.startsWith('/') && !target.startsWith('//'))))
    return inline(label)
  const escaped = target.replace(/</g, '%3C').replace(/>/g, '%3E')
    .replace(/[\r\n\t ]/g, (ch) => encodeURIComponent(ch))
  return '[' + inline(label) + '](<' + escaped + '>)'
}

export function quoteBookmark(item) {
  if (!item?.id || Number(item.status) < 3)
    throw new Error('只能引用已公開的書籤')

  const title = String(item.title_zh || item.title || item.title_original || '書籤').trim()
  const permalink = item.slug
    ? '/bookmarks/' + encodeURIComponent(item.slug) + '/'
    : '/bookmarks/view/?id=' + encodeURIComponent(item.id)
  const lines = [
    '**' + link(title, permalink) + '**',
  ]
  if (item.title_original && item.title_original !== title)
    lines.push('', '原文標題：' + inline(item.title_original))

  if (item.summary?.trim())
    lines.push('', ...item.summary.trim().split(/\r?\n/))

  const source = item.preferred_url || item.redirect_url || item.url
  if (source) lines.push('', '來源文章：' + link(source, source))
  if (item.url && item.url !== source)
    lines.push('原始網址：' + link(item.url, item.url))
  if (item.redirect_url && item.redirect_url !== source && item.redirect_url !== item.url)
    lines.push('重導向網址：' + link(item.redirect_url, item.redirect_url))

  for (const ref of item.references || []) {
    if (!ref?.url) continue
    const name = ref.kind === 'hacker-news' ? 'Hacker News 留言' : (ref.title || '參考網址')
    lines.push('延伸參考：' + link(name, ref.url))
  }
  if (item.tags?.length)
    lines.push('', '分類：' + item.tags.map(inline).join('、'))
  const date = item.status_at || item.published_at || item.created_at
  if (date) lines.push('日期：' + inline(String(date).slice(0, 10)))
  lines.push('狀態：' + (Number(item.status) === 4 ? '推薦' : '公開'))

  return {
    title: title.slice(0, 160),
    bookmark: { id: item.id, title, url: item.url || source || '' },
    markdown: '## 引用書籤\n\n' +
      lines.map((line) => line ? '> ' + line : '>').join('\n') +
      '\n\n## 心得\n\n',
  }
}
