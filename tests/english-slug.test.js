import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugifyEnglish } from '../src/slug.js'
import { translatedNoteSlug } from '../src/english-slug.js'
import { rssXml } from '../src/feeds.js'
import worker from '../src/index.js'

test('English slug preserves technical terms without pinyin', async () => {
  assert.equal(slugifyEnglish('Microsoft 365 down for a day'), 'microsoft-365-down-for-a-day')
  assert.throws(() => slugifyEnglish('Microsoft 365 掛掉'), /英文網址/)
  assert.equal(await translatedNoteSlug({}, 'Microsoft 365 down for a day'), 'microsoft-365-down-for-a-day')
  let invoked = 0
  const ai = {AI: {run: async (model, params) => {
    invoked++
    assert.equal(model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast')
    assert.match(params.messages[1].content, /憑證/)
    return {response:'emudhra-certificate-for-hardware-hacking'}
  }}}
  assert.equal(await translatedNoteSlug(ai,'eMudhra 憑證可供硬體破解'), 'emudhra-certificate-for-hardware-hacking')
  assert.equal(invoked, 1)
})

test('Translation failure stops publication instead of creating pinyin links', async () => {
  await assert.rejects(translatedNoteSlug({},'中文標題'), /翻譯服務/)
  await assert.rejects(translatedNoteSlug({AI:{run:async()=>({response:'zhong-wen 這個'})}},'中文標題'), /翻譯結果/)
  await assert.rejects(translatedNoteSlug({AI:{run:async()=>{throw Error('offline')}}},'中文標題'), /翻譯服務/)
})

test('RSS keeps historic GUID while linking to new canonical permalink', () => {
  const note = {
    id:'20261116-de30a1b21e', slug:'emudhra-certificate-for-hardware-hacking',
    rss_slug:'emudhra-ping-zheng-ke-yi-li-yong-lai-jian-li-zi-ji-de-ying-ti-po-jie-zhi-guan-jian-bu-zhou-zhi-yi-su',
    markdown:'內容',title:'eMudhra 憑證',status:'published',
    published_at:'2026-11-16T10:23:11.978Z', created_at:'2026-11-16T10:23:11.978Z',tags:[]
  }
  const xml = rssXml([note], 'https://christorng.idv.tw')
  assert.match(xml, /<link>https:\/\/christorng.idv.tw\/notes\/emudhra-certificate-for-hardware-hacking\/<\/link>/)
  assert.match(xml, /<guid isPermaLink="true">https:\/\/christorng.idv.tw\/notes\/emudhra-ping-zheng-/)
})

test('Old published note URL permanently redirects to English canonical path', async () => {
  const note = {
    id:'20261116-de30a1b21e',slug:'emudhra-certificate-for-hardware-hacking',
    status:'published',title:'eMudhra 憑證',markdown:'內容',tags:'[]'
  }
  const db = {prepare(sql) {
    return {bind() {
      return {first:async()=>sql.includes('FROM note_slug_aliases a')?note:null}
    }}
  }}
  const response = await worker.fetch(
    new Request('https://christorng.idv.tw/notes/emudhra-ping-zheng-ke-yi-li-yong-lai-jian-li-zi-ji-de-ying-ti-po-jie-zhi-guan-jian-bu-zhou-zhi-yi-su/'),
    {DB:db}
  )
  assert.equal(response.status,308)
  assert.equal(response.headers.get('location'),
    'https://christorng.idv.tw/notes/emudhra-certificate-for-hardware-hacking/')
})
