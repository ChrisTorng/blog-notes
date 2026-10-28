import { test } from 'node:test'
import assert from 'node:assert/strict'
import { XMLValidator } from 'fast-xml-parser'
import { individualPage } from '../src/views.js'
import { rssXml, parseBlogFeed, readBlogFeed } from '../src/feeds.js'
const note = {
  id: '20261027-0123456789',
  title: '<測試>',
  markdown:
    '<script>bad</script>\n\n[文章](/blog/example/)\n\n![圖片](/image.png)',
  tags: ['ai'],
  status: 'published',
  created_at: '2026-10-27T00:00:00.000Z',
  published_at: '2026-10-27T00:00:00.000Z',
  updated_at: '2026-10-27T00:00:00.000Z',
}
test('JSON-LD safely preserves angle brackets and RSS makes links absolute', () => {
  const html = individualPage(note, 'https://example.org')
  const ld = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s
  )[1]
  assert.equal(JSON.parse(ld).headline, note.title)
  assert.ok(!ld.includes('<'))
  const xml = rssXml([note], 'https://example.org')
  assert.equal(XMLValidator.validate(xml), true)
  assert.ok(xml.includes('https://example.org/blog/example/'))
  assert.ok(xml.includes('https://example.org/image.png'))
})
test('malformed blog RSS is rejected and fetch failures degrade explicitly', async () => {
  assert.throws(() => parseBlogFeed('<html>oops</html>'))
  assert.throws(() => parseBlogFeed('<rss><channel>'))
  const result = await readBlogFeed('http://127.0.0.1:1/no-feed')
  assert.equal(result.items.length, 0)
  assert.ok(result.error)
})
