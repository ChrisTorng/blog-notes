import { notesExport } from './export.js'
import {
  allTags,
  createNote,
  deleteNote,
  getNote,
  getNoteBySlug,
  listNotes,
  PAGE_SIZE,
  pageNumber,
  updateNote,
} from './data.js'
import { ensurePublishedBookmark } from './bookmark-publication.js'
import { adminIdentity, allowedOrigin } from './auth.js'
import { noteTitle, renderMarkdown } from './markdown.js'
import { readLimitedText } from './http.js'
import { publicNotePage } from './public-page.js'
import { bookmarkEmbeds } from './bookmark-embed.js'
import { allRssXml, readBlogItems, rssXml, sitemapXml } from './feeds.js'

// UI is a static GitHub Pages build. Worker routes serve only JSON and RSS/XML.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
const xml = (body, mime = 'application/xml', hasReferences = false) =>
  new Response(body, {
    headers: {
      'Content-Type': mime + '; charset=utf-8',
      'Cache-Control': hasReferences ? 'no-store' : 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
const siteUrl = (env) => (env.SITE_URL || 'https://christorng.idv.tw').replace(/\/$/, '')
const noteSlug = /^[0-9]{8}-[a-f0-9]{10}$/


async function readPayload(req) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw Error('Content-Type 必須為 application/json')
  const content = await readLimitedText(req, 150000)
  if (content.length > 110000) throw Error('請求內容過大')
  try {
    return JSON.parse(content)
  } catch {
    throw Error('JSON 格式無效')
  }
}

async function adminApi(req, env, url, path) {
  const identity = await adminIdentity(req, env)
  if (!identity) return json({ error: '尚未通過管理員驗證' }, 401)
  if (!allowedOrigin(req, env)) return json({ error: '不允許跨來源修改' }, 403)
  if (path === '/notes/api/admin/export' && req.method === 'GET')
    return notesExport(env.DB)
  if (path === '/notes/api/admin/whoami' && req.method === 'GET')
    return json(identity)
  const bookmark = path.match(/^\/notes\/api\/admin\/bookmarks\/([0-9a-f-]{36})$/)
  if (bookmark && req.method === 'GET') {
    const html = await env.BOOKMARK_EDITOR.previewBookmark(bookmark[1])
    return html ? json({ html }) : json({ error: '引用的書籤不存在' }, 404)
  }
  if (path === '/notes/api/admin/preview' && req.method === 'POST') {
    const data = await readPayload(req)
    if (typeof data.markdown !== 'string' || data.markdown.length > 30000)
      return json({ error: 'Markdown 格式或長度無效' }, 400)
    return json({
      html: renderMarkdown(data.markdown),
      title: noteTitle({ title: typeof data.title === 'string' ? data.title.slice(0, 160) : null, markdown: data.markdown }),
    })
  }
  if (path === '/notes/api/admin/' || path === '/notes/api/admin') {
    if (req.method === 'GET') return json(await listNotes(env.DB, {
      includeDraft: true,
      pageSize: 100,
      page: pageNumber(url.searchParams.get('page')),
    }))
    if (req.method === 'POST') {
      const raw = await readPayload(req)
      await ensurePublishedBookmark(env, raw)
      return json(await createNote(env.DB, raw), 201)
    }
  }
  const found = path.match(/^\/notes\/api\/admin\/([^/]+)\/?$/)
  if (found && noteSlug.test(found[1])) {
    if (req.method === 'GET') {
      const item = await getNote(env.DB, found[1], true)
      return item ? json(item) : json({ error: '找不到資料' }, 404)
    }
    if (req.method === 'PUT') {
      // Avoid recommending a bookmark when the requested Note does not exist.
      if (!await getNote(env.DB, found[1], true))
        return json({ error: '找不到資料' }, 404)
      const raw = await readPayload(req)
      await ensurePublishedBookmark(env, raw)
      const item = await updateNote(env.DB, found[1], raw)
      return item ? json(item) : json({ error: '找不到資料' }, 404)
    }
    if (req.method === 'DELETE') {
      const deleted = await deleteNote(env.DB, found[1])
      return deleted ? json({ ok: true }) : json({ error: '找不到資料' }, 404)
    }
  }
  return json({ error: '不存在的管理 API' }, 404)
}

async function combinedData(env, page, tag = '') {
  const count = page * PAGE_SIZE
  const [first, blogs] = await Promise.all([
    listNotes(env.DB, { page: 1, pageSize: Math.min(100, count), tag }),
    readBlogItems(env),
  ])
  const notesBatch = [...first.items]
  while (notesBatch.length < Math.min(first.total, count)) {
    const next = await listNotes(env.DB, {
      page: Math.floor(notesBatch.length / 100) + 1,
      pageSize: 100,
      tag,
    })
    if (!next.items.length) break
    notesBatch.push(...next.items)
  }
  const blogItems = tag ? blogs.items.filter((item) => item.tags.includes(tag)) : blogs.items
  const items = [
    ...notesBatch.map((note) => ({
      kind: 'note',
      ...note,
      date: note.published_at || note.created_at,
      displayTitle: noteTitle(note),
    })),
    ...blogItems,
  ].sort((a, b) => b.date.localeCompare(a.date))
  const total = first.total + blogItems.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return {
    items: page > pages ? [] : items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page, pages, total,
    warning: blogs.error,
  }
}

const worker = {
  async fetch(req, env) {
    if (req.method === 'HEAD') {
      const result = await worker.fetch(new Request(req, { method: 'GET' }), env)
      return new Response(null, { status: result.status, headers: result.headers })
    }
    const url = new URL(req.url)
    const path = url.pathname
    if (req.method === 'OPTIONS') return new Response(null, { status: 405 })
    try {
      if (path === '/notes/api/admin' || path.startsWith('/notes/api/admin/'))
        return adminApi(req, env, url, path)
      if (/^\/notes\/api\/session\/?$/.test(path) && req.method === 'GET')
        return json({ admin: Boolean(await adminIdentity(req, env)) })
      if (path === '/notes/api/categories' && req.method === 'GET') {
        const rows = await env.DB.prepare(
          "SELECT nt.tag_id, COUNT(*) AS count FROM note_tags nt JOIN notes n ON n.id=nt.note_id WHERE n.status='published' GROUP BY nt.tag_id"
        ).all()
        return json(allTags.map((tag) => ({
          ...tag, noteCount: rows.results.find((row) => row.tag_id === tag.id)?.count || 0,
        })))
      }
      if (path === '/notes/api/tags' && req.method === 'GET') return json(allTags)
      if ((path === '/notes/api' || path === '/notes/api/') && req.method === 'GET')
        return json(await listNotes(env.DB, {
          page: pageNumber(url.searchParams.get('page')),
          tag: url.searchParams.get('tag') || '',
        }))
      if (path === '/notes/api/all' && req.method === 'GET')
        return json(await combinedData(env, pageNumber(url.searchParams.get('page')), url.searchParams.get('tag') || ''))
      if (path.startsWith('/notes/api/') && req.method === 'GET') {
        const id = decodeURIComponent(path.slice('/notes/api/'.length)).replace(/\/$/, '')
        if (!noteSlug.test(id)) return json({ error: '資料不存在' }, 404)
        const item = await getNote(env.DB, id)
        return item ? json(item) : json({ error: '資料不存在' }, 404)
      }
      if (path === '/notes/feed.xml' && req.method === 'GET') {
        const tag = url.searchParams.get('tag') || ''
        const data = await listNotes(env.DB, { pageSize: 100, tag })
        const embeds = await bookmarkEmbeds(data.items, env, siteUrl(env))
        return xml(rssXml(data.items, siteUrl(env), tag, embeds), 'application/rss+xml', Object.keys(embeds).length > 0)
      }
      if (path === '/notes/all/feed.xml' && req.method === 'GET') {
        const tag = url.searchParams.get('tag') || ''
        const [notes, blogs] = await Promise.all([
          listNotes(env.DB, { pageSize: 100, tag }),
          readBlogItems(env),
        ])
        if (blogs.error && !blogs.items.length)
          return new Response(blogs.error, { status: 503, headers: { 'Retry-After': '60' } })
        const embeds = await bookmarkEmbeds(notes.items, env, siteUrl(env))
        return xml(allRssXml(notes.items, blogs.items, siteUrl(env), tag, embeds), 'application/rss+xml', Object.keys(embeds).length > 0)
      }
      if (path === '/notes/sitemap.xml' && req.method === 'GET') {
        const total = (await listNotes(env.DB, { pageSize: 1 })).total
        const notes = []
        for (let count = 0; count < total; count += 100) {
          const result = await listNotes(env.DB, { page: Math.floor(count / 100) + 1, pageSize: 100 })
          notes.push(...result.items)
        }
        return xml(sitemapXml(notes, siteUrl(env)))
      }
      if (req.method === 'GET') {
        // Existing ID links redirect only for public notes; private editor previews
        // retain the legacy static route and authentication checks.
        const oldId = path === '/notes/view/' || path === '/notes/view'
          ? url.searchParams.get('id') : null
        if (oldId && noteSlug.test(oldId)) {
          const existing = await getNote(env.DB, oldId)
          if (existing?.slug)
            return Response.redirect(url.origin + '/notes/' + encodeURIComponent(existing.slug) + '/', 308)
        }
        const match = path.match(/^\/notes\/([a-z0-9-]{1,100})\/?$/)
        if (match && !['view','editor','admin','api','all','page'].includes(match[1])) {
          const key = match[1]
          const note = noteSlug.test(key) ? await getNote(env.DB,key) : await getNoteBySlug(env.DB,key)
          if (note?.slug) {
            const canonical = '/notes/' + note.slug + '/'
            if (url.pathname !== canonical) return Response.redirect(url.origin + canonical,308)
            const embeds = await bookmarkEmbeds([note], env, url.origin)
            return publicNotePage(req,note,embeds[note.bookmark_id] || '')
          }
          return json({ error: '找不到隨筆' },404)
        }
      }
      // All other paths remain on the GitHub Pages static origin.
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
        return json({ error: '不存在的 API' },404)
      return fetch(req)
    } catch (e) {
      if (e instanceof URIError) return json({ error: '網址格式無效' }, 400)
      const bad = e instanceof Error && /Markdown|Tag|tags|標題|狀態|JSON|請求|未知|Content-Type|資料|引用書籤|分類|AI/.test(e.message)
      return json({ error: bad ? e.message : '伺服器內部錯誤' }, bad ? 400 : 500)
    }
  },
}
export default worker
