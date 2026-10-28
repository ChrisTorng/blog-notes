import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { parseBlogIndex, readBlogItems } from '../src/feeds.js'
const article = {
  kind: 'blog',
  title: '測試',
  url: 'https://example.org/blog/test/',
  date: '2026-10-27',
  tags: ['ai'],
}
test('full article index validates records and normalizes timestamps', () => {
  const items = parseBlogIndex(JSON.stringify({ version: 1, items: [article] }))
  assert.equal(items[0].date, '2026-10-27T00:00:00.000Z')
  assert.throws(() => parseBlogIndex(JSON.stringify({ version: 2, items: [] })))
  assert.throws(() =>
    parseBlogIndex(
      JSON.stringify({
        version: 1,
        items: [{ ...article, url: 'javascript:bad' }],
      })
    )
  )
})
test('missing full index falls back to RSS with an explicit warning', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/index') {
      res.writeHead(404)
      res.end('missing')
      return
    }
    res.end(
      '<rss version="2.0"><channel><title>Blog</title><item><title>Article</title><link>https://example.org/blog/test/</link><pubDate>Tue, 27 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>'
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const base = 'http://127.0.0.1:' + server.address().port
    const result = await readBlogItems({
      BLOG_INDEX_URL: base + '/index',
      BLOG_FEED_URL: base + '/feed',
    })
    assert.equal(result.items.length, 1)
    assert.equal(result.source, 'rss')
    assert.ok(result.error)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
