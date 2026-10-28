import assert from 'node:assert/strict'
import fs from 'node:fs'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw Error('Local tests only')
const token = fs
  .readFileSync('.dev.vars', 'utf8')
  .match(/^LOCAL_ADMIN_TOKEN=(.+)$/m)?.[1]
  .trim()
const ids = []
let checks = 0
const verify = (condition, label) => {
  assert.ok(condition, label)
  checks++
  console.log(`PASS ${label}`)
}
async function call(
  path,
  { method = 'GET', data, auth = false, headers = {}, status = 200 } = {}
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${await (response.status === status ? Promise.resolve('') : response.text())}`
  )
  assert.equal(
    new URL(response.url).origin,
    new URL(base).origin,
    'proxy must retain browser origin'
  )
  return response
}
const admin = '/notes/api/admin/'
const xmlParser = new XMLParser({ ignoreAttributes: false })
try {
  await call(admin, { status: 401 })
  await call(admin, {
    headers: { 'Cf-Access-Authenticated-User-Email': 'spoof@example.org' },
    status: 401,
  })
  await call(admin, {
    method: 'POST',
    auth: true,
    data: { markdown: 'X' },
    headers: { Origin: 'https://evil.example' },
    status: 403,
  })
  await call(admin, {
    method: 'POST',
    auth: true,
    data: { markdown: 'X', tags: ['unknown'] },
    status: 400,
  })
  await call('/notes/api/%zz', { status: 400 })
  verify(
    true,
    'unauthorized, spoofed identity, cross-origin write and invalid input rejected'
  )
  const marker = `Local test ${Date.now()}`
  let note = await (
    await call(admin, {
      method: 'POST',
      auth: true,
      status: 201,
      data: {
        title: marker,
        markdown:
          '**粗體**\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))',
        status: 'draft',
        tags: ['ai'],
      },
    })
  ).json()
  ids.push(note.id)
  await call(`/notes/api/${note.id}`, { status: 404 })
  await call(`/notes/${note.id}/`, { status: 404 })
  const draftFeed = await (await call('/notes/feed.xml')).text()
  verify(
    !draftFeed.includes(marker),
    'draft absent from public API, SSR and RSS'
  )
  note = await (
    await call(admin + note.id, {
      method: 'PUT',
      auth: true,
      data: { ...note, status: 'published' },
    })
  ).json()
  const firstPublished = note.published_at
  const rendered = await (await call(`/notes/${note.id}/`)).text()
  const jsonld = rendered.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s
  )?.[1]
  verify(
    JSON.parse(jsonld).headline === marker &&
      rendered.includes('<strong>粗體</strong>') &&
      !rendered.includes('<script>alert(1)</script>') &&
      !rendered.includes('href="javascript:'),
    'SSR Markdown, XSS protection and valid JSON-LD'
  )
  const preview = await (
    await call(admin + 'preview', {
      method: 'POST',
      auth: true,
      data: { markdown: '## 預覽\n\n**粗體**' },
    })
  ).json()
  verify(
    preview.html.includes('<h2>預覽</h2>') &&
      preview.html.includes('<strong>粗體</strong>'),
    'editor preview endpoint renders Markdown'
  )
  note = await (
    await call(admin + note.id, {
      method: 'PUT',
      auth: true,
      data: { ...note, title: marker + ' updated' },
    })
  ).json()
  verify(
    note.published_at === firstPublished,
    'editing retains original publication time and permalink'
  )
  for (const path of ['/notes/style.css', '/notes/editor.js', '/notes/editor/'])
    await call(path)
  const head = await call(`/notes/${note.id}/`, { method: 'HEAD' })
  verify(
    !(await head.text()) &&
      head.headers.get('content-type').includes('text/html'),
    'HEAD and editor static assets work'
  )
  for (let offset = 0; offset < 105; offset += 5)
    await Promise.all(
      Array.from({ length: Math.min(5, 105 - offset) }, async (_, j) => {
        const n = await (
          await call(admin, {
            method: 'POST',
            auth: true,
            status: 201,
            data: {
              title: `${marker} fixture ${offset + j}`,
              markdown: '分頁測試',
              status: 'published',
              tags: [(offset + j) % 2 ? 'music' : 'ai'],
            },
          })
        ).json()
        ids.push(n.id)
      })
    )
  const first = await (await call('/notes/api/')).json(),
    second = await (await call('/notes/api/?page=2')).json()
  verify(
    first.items.length === 20 &&
      second.items.length === 20 &&
      !first.items.some((a) => second.items.some((b) => a.id === b.id)),
    'public pagination has no overlapping items'
  )
  const managed = await (await call(admin, { auth: true })).json(),
    managed2 = await (await call(admin + '?page=2', { auth: true })).json()
  verify(
    managed.items.length === 100 && managed2.items.length >= 6,
    'admin pagination reaches notes beyond first 100'
  )
  const filtered = await (await call('/notes/api/?tag=music')).json()
  verify(
    filtered.items.every((n) => n.tags.includes('music')),
    'tag filtering'
  )
  for (const path of [
    '/notes/feed.xml',
    '/notes/all/feed.xml',
    '/notes/sitemap.xml',
  ]) {
    const value = await (await call(path)).text()
    verify(
      XMLValidator.validate(value) === true && value.includes(ids.at(-1)),
      `valid XML and recent published entry in ${path}`
    )
    if (path.includes('sitemap'))
      verify(
        ids.every((id) => value.includes(id)),
        'sitemap includes all 106 fixtures across D1 pages'
      )
    if (path === '/notes/feed.xml')
      verify(
        xmlParser.parse(value).rss.channel.item.length === 100,
        'Notes RSS caps at latest 100 entries'
      )
  }
  const blogResponse = await fetch('http://127.0.0.1:3000/feed.xml')
  assert.equal(blogResponse.status, 200)
  const articleResponse = await fetch(
    'http://127.0.0.1:3000/articles-index.json'
  )
  assert.equal(articleResponse.status, 200)
  const { items: articles } = await articleResponse.json()
  const combined = await (await call('/notes/api/all')).json()
  verify(
    !combined.warning && combined.total === first.total + articles.length,
    'mixed timeline reads the complete local Next.js article index with correct total'
  )
  verify(
    combined.items.every(
      (item, i, items) =>
        i === 0 ||
        (items[i - 1].date || items[i - 1].published_at) >=
          (item.date || item.published_at)
    ),
    'mixed timeline sorted newest first'
  )
  const seen = new Set()
  let blogSeen = false,
    noteSeen = false
  for (let page = 1; page <= combined.pages; page++) {
    const batch = await (await call(`/notes/api/all?page=${page}`)).json()
    for (const item of batch.items) {
      const key = item.kind === 'note' ? item.id : item.url
      assert.ok(!seen.has(key), 'duplicate timeline item')
      seen.add(key)
      blogSeen ||= item.kind === 'blog'
      noteSeen ||= item.kind === 'note'
    }
  }
  verify(
    seen.size === combined.total && blogSeen && noteSeen,
    'all mixed timeline pages contain both real articles and notes without gaps or duplicates'
  )
  await call('/notes/all/page/100000/', { status: 404 })
  await call('/notes/page/100000/', { status: 404 })
  await call('/notes/')
  await call('/notes')
  await call('/notes/?tag=ai')
  await call('/notes/all/')
  verify(true, 'mixed SSR and out-of-range page responses')
  await call(admin + note.id, {
    method: 'PUT',
    auth: true,
    data: { ...note, status: 'draft' },
  })
  await call(`/notes/api/${note.id}`, { status: 404 })
  verify(
    !(await (await call('/notes/sitemap.xml')).text()).includes(note.id),
    'unpublish removes note from public view and sitemap'
  )
  console.log(
    JSON.stringify({
      base,
      checks,
      blogArticles: articles.length,
      fixtures: ids.length,
      result: 'PASS',
    })
  )
} finally {
  for (const id of ids) await call(admin + id, { method: 'DELETE', auth: true })
  console.log(`Cleaned ${ids.length} test notes`)
}
