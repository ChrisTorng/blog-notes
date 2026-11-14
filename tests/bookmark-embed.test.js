import { test } from 'node:test'
import assert from 'node:assert/strict'
import { XMLValidator } from 'fast-xml-parser'
import { bookmarkEmbeds } from '../src/bookmark-embed.js'
import { noteArticleHtml } from '../src/public-content.js'
import { rssXml, allRssXml } from '../src/feeds.js'
import { checkNoteInput } from '../src/data.js'

const id = '7b746260-8314-48ac-87f1-541426562c35'
const note = {
  id: '20261114-1234567890', slug: 'thoughts', title: '心得',
  markdown: '這是我自己的心得，不應包含書籤快照。',
  bookmark_id: id, tags: ['ai'], status: 'published',
  created_at: '2026-11-14T00:00:00.000Z',
  published_at: '2026-11-14T00:00:00.000Z',
  updated_at: '2026-11-14T00:00:00.000Z',
}

test('only bookmark ID is persisted, with no stale title, URL, or summary', () => {
  const input = checkNoteInput({
    title: '心得', markdown: '我的心得', bookmark_id: id,
    bookmark_title: '舊標題', bookmark_url: 'https://example.org/old',
  })
  assert.equal(input.bookmark_id, id)
  assert.equal(input.bookmark_title, null)
  assert.equal(input.bookmark_url, null)
})

test('resolve live HTML from Bookmarks service once per ID, for both page and feeds', async () => {
  let calls = 0
  const html = '<article><h1>最新標題</h1><a href="/bookmarks/">分類</a></article>'
  const env = {
    BOOKMARKS: { async fetch(request) {
      calls++
      assert.equal(new URL(request.url).pathname, '/bookmarks/api/embed/' + id)
      return new Response(html, { headers: { 'Content-Type': 'text/html' } })
    } },
  }
  const embeds = await bookmarkEmbeds([note, note], env, 'https://example.org')
  assert.equal(calls, 1)
  assert.ok(embeds[id].includes('<h1>最新標題</h1>'))
  assert.ok(embeds[id].includes('href="https://example.org/bookmarks/"'))
  const page = noteArticleHtml(note, 'https://example.org', embeds[id])
  assert.ok(page.indexOf('最新標題') < page.indexOf('自己的心得'))
  for (const xml of [
    rssXml([note], 'https://example.org', '', embeds),
    allRssXml([note], [], 'https://example.org', '', embeds),
  ]) {
    assert.equal(XMLValidator.validate(xml), true)
    assert.ok(xml.includes('<![CDATA[' + page + ']]>'))
    assert.ok(xml.includes('最新標題'))
  }
  // A later source change is reflected on the next request, not an old Note field.
  env.BOOKMARKS.fetch = async () => new Response('<article>第二版</article>')
  const changed = await bookmarkEmbeds([note], env, 'https://example.org')
  assert.ok(changed[id].includes('第二版'))
})

test('unpublished or deleted bookmark does not leak old text', async () => {
  const result = await bookmarkEmbeds([note], {
    BOOKMARKS: { fetch: async () => new Response('', { status: 404 }) },
  }, 'https://example.org')
  assert.match(result[id], /目前未公開或已移除/)
  assert.ok(!result[id].includes('舊標題'))
})
