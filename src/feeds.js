import { readLimitedText } from './http.js'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import {
  htmlEscape,
  notePath,
  noteTitle,
  plainText,
  renderMarkdown,
} from './views.js'

function isoSafe(date) {
  const result = new Date(date)
  return Number.isNaN(result.valueOf())
    ? new Date(0).toISOString()
    : result.toISOString()
}
function pubDate(date) {
  return new Date(isoSafe(date)).toUTCString()
}

function noteRssItem(n, siteUrl) {
  const url = `${siteUrl}${notePath(n.id)}`
  return `<item><title>${htmlEscape(noteTitle(n))}</title><link>${htmlEscape(url)}</link><guid isPermaLink="true">${htmlEscape(url)}</guid><pubDate>${pubDate(n.published_at || n.created_at)}</pubDate><description>${htmlEscape(plainText(n.markdown))}</description><content:encoded>${htmlEscape(
    renderMarkdown(n.markdown).replace(
      /\b(href|src)="([^"]*)"/g,
      (match, attr, value) => {
        if (/^(?:[a-z][a-z0-9+.-]*:)/i.test(value)) return match
        return (
          attr +
          '="' +
          new URL(value.replaceAll('&amp;', '&'), url).href.replaceAll(
            '&',
            '&amp;'
          ) +
          '"'
        )
      }
    )
  )}</content:encoded>${n.tags.map((t) => `<category>${htmlEscape(t)}</category>`).join('')}</item>`
}
function articleRssItem(item) {
  return `<item><title>${htmlEscape(item.title)}</title><link>${htmlEscape(item.url)}</link><guid isPermaLink="true">${htmlEscape(item.url)}</guid><pubDate>${pubDate(item.date)}</pubDate><description>${htmlEscape(item.summary)}</description>${item.tags.map((t) => `<category>${htmlEscape(t)}</category>`).join('')}</item>`
}
function wrapRss(items, siteUrl, title, link) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${htmlEscape(title)}</title><link>${htmlEscape(`${siteUrl}${link}`)}</link><description>${htmlEscape(title)}</description><language>zh-TW</language>${items.join('')}</channel></rss>`
}
export function rssXml(notes, siteUrl) {
  return wrapRss(
    notes.map((n) => noteRssItem(n, siteUrl)),
    siteUrl,
    'ChrisTorng 學習天地 — 隨筆',
    '/notes/'
  )
}
export function allRssXml(notes, blogItems, siteUrl) {
  const items = [
    ...notes.map((note) => ({
      kind: 'note',
      date: note.published_at || note.created_at,
      note,
    })),
    ...blogItems,
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100)
    .map((item) =>
      item.kind === 'note'
        ? noteRssItem(item.note, siteUrl)
        : articleRssItem(item)
    )
  return wrapRss(
    items,
    siteUrl,
    'ChrisTorng 學習天地 — 全部更新',
    '/notes/all/'
  )
}
export function sitemapXml(notes, siteUrl) {
  const urls = [
    `${siteUrl}/notes/`,
    ...notes.map((n) => `${siteUrl}${notePath(n.id)}`),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url, i) => `<url><loc>${htmlEscape(url)}</loc>${i ? `<lastmod>${isoSafe(notes[i - 1].updated_at)}</lastmod>` : ''}</url>`).join('')}</urlset>`
}

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  processEntities: true,
})
function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export function parseBlogFeed(xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid RSS XML')
  const data = parser.parse(xml)
  if (!data?.rss?.channel) throw new Error('Missing RSS channel')
  const raw = data?.rss?.channel?.item ?? []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .filter(
      (x) =>
        x &&
        x.link &&
        x.title &&
        /^https:\/\//.test(String(x.link)) &&
        !Number.isNaN(new Date(x.pubDate || x['dc:date'] || 0).valueOf())
    )
    .map((x) => ({
      kind: 'blog',
      url: String(x.link),
      title: String(x.title),
      summary: stripHtml(
        typeof x.description === 'string'
          ? x.description
          : String(x.description?.['#text'] ?? '')
      ),
      tags: (Array.isArray(x.category)
        ? x.category
        : x.category
          ? [x.category]
          : []
      ).map(String),
      date: new Date(x.pubDate || x['dc:date'] || 0).toISOString(),
    }))
}
export async function readBlogFeed(url) {
  if (!url) return { items: [], error: '未設定 BLOG_FEED_URL' }
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/rss+xml, application/xml' },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await readLimitedText(response, 6_000_000)
    if (text.length > 6_000_000) throw new Error('Feed 過大')
    return { items: parseBlogFeed(text), error: null }
  } catch {
    return { items: [], error: '目前無法取得文章 RSS，暫時只顯示隨筆。' }
  }
}

export function parseBlogIndex(text) {
  const data = JSON.parse(text)
  if (data.version !== 1 || !Array.isArray(data.items))
    throw new Error('Invalid article index')
  return data.items.map((item) => {
    if (
      item.kind !== 'blog' ||
      typeof item.title !== 'string' ||
      typeof item.url !== 'string' ||
      !/^https:\/\//.test(item.url) ||
      !Array.isArray(item.tags) ||
      !item.tags.every((tag) => typeof tag === 'string') ||
      typeof item.date !== 'string' ||
      Number.isNaN(new Date(item.date).valueOf())
    )
      throw new Error('Invalid article')
    return {
      ...item,
      summary: String(item.summary || ''),
      date: new Date(item.date).toISOString(),
    }
  })
}
export async function readBlogItems(env) {
  if (env.BLOG_INDEX_URL) {
    try {
      const response = await fetch(env.BLOG_INDEX_URL, {
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error('Article index unavailable')
      return {
        items: parseBlogIndex(await readLimitedText(response, 6_000_000)),
        error: null,
        source: 'index',
      }
    } catch {
      const fallback = await readBlogFeed(env.BLOG_FEED_URL)
      return {
        ...fallback,
        error:
          fallback.error ||
          '完整文章索引暫時無法取得，目前僅顯示 RSS 中的近期文章。',
        source: 'rss',
      }
    }
  }
  return { ...(await readBlogFeed(env.BLOG_FEED_URL)), source: 'rss' }
}
