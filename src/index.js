import { notesExport } from './export.js'
import {
  allTags,
  noteTagCounts,
  createNote,
  deleteNote,
  getNote,
  listNotes,
  PAGE_SIZE,
  pageNumber,
  updateNote,
} from './data.js'
import { adminIdentity, allowedOrigin } from './auth.js'
import {
  articleCard,
  editorPage,
  htmlEscape,
  individualPage,
  listingPage,
  noteCard,
  pageHtml,
  pager,
  renderMarkdown,
} from './views.js'
import { withSiteTheme } from './site-theme.js'
import { noteTitle } from './views.js'
import { readLimitedText } from './http.js'
import { allRssXml, readBlogItems, rssXml, sitemapXml } from './feeds.js'

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
const html = (
  body,
  status = 200,
  cache = 'public, max-age=0, must-revalidate'
) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    },
  })
const xml = (body, mime = 'application/xml') =>
  new Response(body, {
    headers: {
      'Content-Type': `${mime}; charset=utf-8`,
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  })
const notFound = () => html('<h1>404 Not Found</h1>', 404)
const unauthorized = () => json({ error: '尚未通過管理員驗證' }, 401)
const siteUrl = (env) =>
  (env.SITE_URL || 'https://christorng.idv.tw').replace(/\/$/, '')
const noteSlug = /^[0-9]{8}-[a-f0-9]{10}$/

async function readPayload(req) {
  if (
    !req.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new Error('Content-Type 必須為 application/json')
  const body = await readLimitedText(req, 150000)
  if (body.length > 110000) throw new Error('請求內容過大')
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('JSON 格式無效')
  }
}

async function handleAdmin(req, env, url, path) {
  const identity = await adminIdentity(req, env)
  if (!identity) return unauthorized()
  if (!allowedOrigin(req, env)) return json({ error: '不允許跨來源修改' }, 403)
  if (path === '/notes/api/admin/export' && req.method === 'GET')
    return notesExport(env.DB)
  if (path === '/notes/api/admin/whoami' && req.method === 'GET')
    return json(identity)
  if (path === '/notes/api/admin/preview' && req.method === 'POST') {
    const data = await readPayload(req)
    if (typeof data.markdown !== 'string' || data.markdown.length > 30000)
      return json({ error: 'Markdown 格式或長度無效' }, 400)
    return json({
      html: renderMarkdown(data.markdown),
      title: noteTitle({
        title: typeof data.title === 'string' ? data.title.slice(0, 160) : null,
        markdown: data.markdown,
      }),
    })
  }
  if (path === '/notes/api/admin/' || path === '/notes/api/admin') {
    if (req.method === 'GET')
      return json(
        await listNotes(env.DB, {
          includeDraft: true,
          pageSize: 100,
          page: pageNumber(url.searchParams.get('page')),
        })
      )
    if (req.method === 'POST')
      return json(await createNote(env.DB, await readPayload(req)), 201)
  }
  const match = path.match(/^\/notes\/api\/admin\/([^/]+)\/?$/)
  if (match && noteSlug.test(match[1])) {
    if (req.method === 'GET') {
      const item = await getNote(env.DB, match[1], true)
      return item ? json(item) : json({ error: '找不到資料' }, 404)
    }
    if (req.method === 'PUT') {
      const item = await updateNote(env.DB, match[1], await readPayload(req))
      return item ? json(item) : json({ error: '找不到資料' }, 404)
    }
    if (req.method === 'DELETE') {
      const deleted = await deleteNote(env.DB, match[1])
      return deleted ? json({ ok: true }) : json({ error: '找不到資料' }, 404)
    }
  }
  return json({ error: '不存在的管理 API' }, 404)
}

async function combinedPage(env, page, tag = '', api = false) {
  const count = page * PAGE_SIZE
  // RSS includes all current Blog posts; Notes queried only up to required page depth.
  const notesBatch = []
  let totalNotes = 0
  const [head, blogs] = await Promise.all([
    listNotes(env.DB, { page: 1, pageSize: Math.min(100, count), tag }),
    readBlogItems(env),
  ])
  totalNotes = head.total
  notesBatch.push(...head.items)
  while (notesBatch.length < Math.min(totalNotes, count)) {
    const next = await listNotes(env.DB, {
      page: Math.floor(notesBatch.length / 100) + 1,
      pageSize: 100,
      tag,
    })
    if (!next.items.length) break
    notesBatch.push(...next.items)
  }
  const blogItems = tag
    ? blogs.items.filter((item) => item.tags.includes(tag))
    : blogs.items
  const all = [
    ...notesBatch.map((n) => ({
      kind: 'note',
      date: n.published_at || n.created_at,
      note: n,
    })),
    ...blogItems,
  ].sort((a, b) => b.date.localeCompare(a.date))
  const total = totalNotes + blogItems.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (page > pages)
    return api ? { items: [], page, pages, total, warning: blogs.error } : null
  const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  if (api)
    return {
      items: items.map((x) =>
        x.kind === 'note'
          ? {
              kind: 'note',
              ...x.note,
              date: x.date,
              displayTitle: noteTitle(x.note),
              html: renderMarkdown(x.note.markdown),
            }
          : { ...x }
      ),
      page,
      pages,
      total,
      warning: blogs.error,
    }
  const body = `<div class="page-heading"><h1>最新 <small>文章與隨筆</small></h1><p>兩種內容依發表時間合併排序。</p>${blogs.error ? `<p class="warning">${htmlEscape(blogs.error)}</p>` : ''}</div><div class="entries">${items.length ? items.map((x) => (x.kind === 'note' ? noteCard(x.note) : articleCard({ ...x, url: new URL(x.url).origin === siteUrl(env) ? new URL(x.url).pathname + new URL(x.url).search : x.url }))).join('') : '<p>目前沒有內容。</p>'}</div>${pager('/notes/all/', page, pages)}`
  return pageHtml({
    title: '最新 — 文章與隨筆',
    canonical: `/notes/all/${page === 1 ? '' : `page/${page}/`}`,
    siteUrl: siteUrl(env),
    current: 'all',
    body,
  })
}

const backend = {
  async fetch(req, env) {
    if (req.method === 'HEAD') {
      const response = await this.fetch(
        new Request(req, { method: 'GET' }),
        env
      )
      return new Response(null, {
        status: response.status,
        headers: response.headers,
      })
    }
    const url = new URL(req.url)
    const path = url.pathname
    const pageMatch = path.match(/^\/notes(?:\/(page\/([1-9]\d*)\/?)?)?$/)
    const allMatch = path.match(/^\/notes\/all(?:\/(page\/([1-9]\d*)\/?)?)?$/)
    try {
      // Both root spellings render directly: external proxies may strip trailing slashes.
      if (req.method === 'OPTIONS')
        return new Response(null, {
          status: 405,
          headers: { Allow: 'GET, HEAD, POST, PUT, DELETE' },
        })
      if (path.startsWith('/notes/api/admin/') || path === '/notes/api/admin')
        return await handleAdmin(req, env, url, path)
      if (/^\/notes\/api\/session\/?$/.test(path) && req.method === 'GET')
        return json({ admin: Boolean(await adminIdentity(req, env)) })
      if (path === '/notes/api/categories' && req.method === 'GET') {
        const result = await env.DB.prepare(
          "SELECT nt.tag_id, COUNT(*) AS count FROM note_tags nt JOIN notes n ON n.id=nt.note_id WHERE n.status='published' GROUP BY nt.tag_id"
        ).all()
        return json(
          allTags.map((tag) => ({
            ...tag,
            noteCount:
              result.results.find((row) => row.tag_id === tag.id)?.count || 0,
          }))
        )
      }
      if (path === '/notes/api/tags' && req.method === 'GET')
        return json(allTags)
      if (
        (path === '/notes/api/' || path === '/notes/api') &&
        req.method === 'GET'
      )
        return json(
          await listNotes(env.DB, {
            page: pageNumber(url.searchParams.get('page')),
            tag: url.searchParams.get('tag') || '',
          })
        )
      if (path === '/notes/api/all' && req.method === 'GET')
        return json(
          await combinedPage(
            env,
            pageNumber(url.searchParams.get('page')),
            url.searchParams.get('tag') || '',
            true
          )
        )
      if (path.startsWith('/notes/api/') && req.method === 'GET') {
        const id = decodeURIComponent(path.slice('/notes/api/'.length)).replace(
          /\/$/,
          ''
        )
        if (!noteSlug.test(id)) return json({ error: '資料不存在' }, 404)
        const item = await getNote(env.DB, id)
        return item ? json(item) : json({ error: '資料不存在' }, 404)
      }
      if (pageMatch && req.method === 'GET') {
        const data = await listNotes(env.DB, {
          page: pageNumber(pageMatch[2]),
          tag: url.searchParams.get('tag') || '',
        })
        if (data.page > data.pages) return notFound()
        return html(
          listingPage(data.items, {
            ...data,
            tagCounts: await noteTagCounts(env.DB),
            tag: url.searchParams.get('tag') || '',
            siteUrl: siteUrl(env),
          })
        )
      }
      if (allMatch && req.method === 'GET')
        return new Response(null, {
          status: 302,
          headers: {
            Location:
              pageNumber(allMatch[2]) === 1
                ? '/'
                : '/?page=' + pageNumber(allMatch[2]),
            'Cache-Control': 'no-store',
          },
        })
      if (path === '/notes/feed.xml' && req.method === 'GET') {
        const tag = url.searchParams.get('tag') || ''
        const data = await listNotes(env.DB, { pageSize: 100, tag })
        return xml(rssXml(data.items, siteUrl(env), tag), 'application/rss+xml')
      }
      if (path === '/notes/all/feed.xml' && req.method === 'GET') {
        const tag = url.searchParams.get('tag') || ''
        const [notes, blogs] = await Promise.all([
          listNotes(env.DB, { pageSize: 100, tag }),
          readBlogItems(env),
        ])
        if (blogs.error && !blogs.items.length)
          return new Response(blogs.error, {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Retry-After': '60',
              'Cache-Control': 'no-store',
            },
          })
        return xml(
          allRssXml(notes.items, blogs.items, siteUrl(env), tag),
          'application/rss+xml'
        )
      }
      if (path === '/notes/sitemap.xml' && req.method === 'GET') {
        // sitemap must include ALL published notes, not only the first page
        const pages = (await listNotes(env.DB, { pageSize: 1 })).total
        const all = []
        for (let n = 0; n < pages; n += 100) {
          const result = await listNotes(env.DB, {
            page: Math.floor(n / 100) + 1,
            pageSize: 100,
          })
          all.push(...result.items)
        }
        return xml(sitemapXml(all, siteUrl(env)))
      }
      if (
        (path === '/notes/editor/' || path === '/notes/editor') &&
        req.method === 'GET'
      ) {
        if (
          !(
            env.AUTH_MODE === 'local' &&
            ['localhost', '127.0.0.1'].includes(url.hostname)
          ) &&
          !(await adminIdentity(req, env))
        )
          return unauthorized()
        const response = html(
          editorPage(siteUrl(env)),
          200,
          'private, no-store'
        )
        // Retire a cached redirect from the first local prototype. Never clear cookies or storage.
        if (
          env.AUTH_MODE === 'local' &&
          ['localhost', '127.0.0.1'].includes(url.hostname) &&
          !req.headers
            .get('cookie')
            ?.split(';')
            .some((value) => value.trim() === 'notes_dev_cache=3')
        ) {
          response.headers.set('Clear-Site-Data', '"cache"')
          response.headers.append(
            'Set-Cookie',
            'notes_dev_cache=3; Path=/notes; SameSite=Lax; HttpOnly'
          )
        }
        return response
      }
      const itemMatch = path.match(/^\/notes\/([0-9]{8}-[a-f0-9]{10})\/?$/)
      if (itemMatch && req.method === 'GET') {
        const note = await getNote(env.DB, itemMatch[1])
        return note ? html(individualPage(note, siteUrl(env))) : notFound()
      }
      if (path.startsWith('/notes/') && req.method === 'GET' && env.ASSETS) {
        return await env.ASSETS.fetch(req)
      }
      return notFound()
    } catch (e) {
      if (e instanceof URIError) return json({ error: '網址格式無效' }, 400)
      const bad =
        e instanceof Error &&
        /Markdown|Tag|tags|標題|狀態|JSON|請求|未知|Content-Type|資料/.test(
          e.message
        )
      return json(
        { error: bad ? e.message : '伺服器內部錯誤' },
        bad ? 400 : 500
      )
    }
  },
}

export default {
  async fetch(req, env) {
    if (req.method === 'HEAD') {
      const response = await this.fetch(
        new Request(req, { method: 'GET' }),
        env
      )
      return new Response(null, {
        status: response.status,
        headers: response.headers,
      })
    }
    const response = await backend.fetch(req, env)
    if (
      response.ok &&
      response.headers.get('Content-Type')?.startsWith('text/html') &&
      !/^\/notes\/editor\/?$/.test(new URL(req.url).pathname)
    )
      return withSiteTheme(response, env)
    return response
  },
}
