import { test } from 'node:test'
import assert from 'node:assert/strict'
import { XMLValidator } from 'fast-xml-parser'
import { noteArticleHtml } from '../src/public-content.js'
import { rssXml, allRssXml } from '../src/feeds.js'
import { renderPublicMarkdown } from '../src/markdown.js'

const note={
  id:'20261107-1234567890',slug:'wo-de-xue-xi-xin-de',title:'我的學習心得',
  markdown:'[文章](/blog/example/)\n\n**重點**\n\n![圖片](/picture.png)\n\n<script>bad()</script>',
  tags:['ai'],status:'published',
  created_at:'2026-11-07T08:00:00.000Z',
  published_at:'2026-11-07T08:00:00.000Z',
  updated_at:'2026-11-07T08:00:00.000Z',
  bookmark_id:'7b746260-8314-48ac-87f1-541426562c35'
}

test('Notes public page, own RSS and combined RSS use identical complete HTML',()=>{
  const html=noteArticleHtml(note,'https://example.org')
  const feed=rssXml([note],'https://example.org')
  const combined=allRssXml([note],[],'https://example.org')
  for(const xml of [feed,combined]){
    assert.equal(XMLValidator.validate(xml),true)
    assert.ok(xml.includes('<content:encoded><![CDATA['+html+']]></content:encoded>'))
    assert.ok(xml.includes('<description>&lt;article'))
    assert.ok(xml.includes('<category>AI</category>'))
  }
  assert.ok(html.includes('<a href="https://example.org/blog/example/">文章</a>'))
  assert.ok(html.includes('<img src="https://example.org/picture.png"'))
  assert.ok(html.includes('<strong>重點</strong>'))
  assert.ok(html.includes('參考書籤'))
  assert.ok(html.includes('/bookmarks/view/?id='))
  assert.ok(html.includes('#AI'))
  assert.ok(!html.includes('<script>'))
})

test('Notes Markdown relative URLs share root-based resolution and reject scripts',()=>{
  assert.ok(renderPublicMarkdown('[link](./test)','https://example.org/notes/slug/')
    .includes('href="https://example.org/test"'))
  assert.doesNotMatch(renderPublicMarkdown('[bad](javascript:alert(1))','https://example.org/'),/href="javascript:/)
})
