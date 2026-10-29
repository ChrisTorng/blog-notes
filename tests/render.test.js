import { formatNoteDate } from '../shared/list-with-categories.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { XMLValidator } from 'fast-xml-parser'
import { individualPage, noteCard, listingPage } from '../src/views.js'
import { rssXml, allRssXml, parseBlogFeed, readBlogFeed } from '../src/feeds.js'
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

test('automatic title preserves literal angle brackets and removes Markdown syntax only', () => {
  const markdown = '測試項目 test <script>alert("a");</script> > 3'
  const html = individualPage(
    { ...note, title: null, markdown },
    'https://example.org'
  )
  const ld = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s
  )[1]
  assert.equal(JSON.parse(ld).headline, markdown)
})

test('detail shows its title once while listing cards keep their titles', () => {
  const html = individualPage(note, 'https://example.org')
  assert.match(html, /<h1 class="note-heading">&lt;測試&gt;<\/h1>/)
  assert.doesNotMatch(html, /<h2>/)
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'))
  assert.match(noteCard(note), /<h2><a[^>]+>&lt;測試&gt;<\/a><\/h2>/)
})

test('Notes listing follows article layout with a visible RSS link and topic navigation', () => {
  const html = listingPage([note], {
    page: 1,
    pages: 1,
    tag: 'ai',
    siteUrl: 'https://example.org',
  })
  assert.ok(html.includes('href="/notes/feed.xml?tag=ai"'))
  assert.ok(html.includes('AI (0)'))
  assert.ok(html.includes('2026/10/27 08:00'))
  assert.ok(!html.includes('永久連結'))
  assert.ok(!html.includes('晚'))
  assert.ok(!html.includes('class="pager"'))
})
test('category combined RSS filters articles and keeps Notes, with a category channel URL', () => {
  const blogs = [
    {
      kind: 'blog',
      title: 'included',
      url: 'https://example.org/yes',
      summary: '',
      tags: ['ai'],
      date: note.created_at,
    },
    {
      kind: 'blog',
      title: 'excluded',
      url: 'https://example.org/no',
      summary: '',
      tags: ['music'],
      date: note.created_at,
    },
  ]
  const xml = allRssXml([note], blogs, 'https://example.org', 'ai')
  assert.equal(XMLValidator.validate(xml), true)
  assert.ok(xml.includes('<title>included</title>'))
  assert.ok(!xml.includes('<title>excluded</title>'))
  assert.ok(xml.includes('/notes/' + note.id + '/'))
  assert.ok(xml.includes('<link>https://example.org/tags/ai/</link>'))
})

test('pagination retains the topic on previous and next links', () => {
  const html = listingPage([note], {
    page: 2,
    pages: 3,
    tag: 'ai',
    siteUrl: 'https://example.org',
    tagCounts: { ai: 41 },
  })
  assert.ok(html.includes('AI (41)'))
  assert.ok(html.includes('href="/notes/?tag=ai" rel="prev"'))
  assert.ok(html.includes('href="/notes/page/3/?tag=ai" rel="next"'))
  assert.ok(html.includes('2/3'))
})

test('Notes show Taipei hours and minutes, including midnight date rollover', () => {
  assert.equal(formatNoteDate('2026-10-28T11:18:08.000Z'), '2026/10/28 19:18')
  assert.equal(formatNoteDate('2026-10-28T16:05:00.000Z'), '2026/10/29 00:05')
  const html = individualPage(
    { ...note, published_at: '2026-10-28T11:18:08.000Z' },
    'https://example.org'
  )
  assert.ok(html.includes('2026/10/28 19:18'))
})

test('Notes always render the complete Markdown through the end, including long entries', () => {
  const content = '完整內文。'.repeat(2000) + '\n\n**全文結尾標記**'
  const item = { ...note, markdown: content }
  for (const html of [
    noteCard(item),
    individualPage(item, 'https://example.org'),
    listingPage([item], { page: 1, pages: 1, siteUrl: 'https://example.org' }),
  ]) {
    assert.ok(html.includes('<strong>全文結尾標記</strong>'))
    assert.equal((html.match(/完整內文。/g) || []).length >= 2000, true)
  }
})
