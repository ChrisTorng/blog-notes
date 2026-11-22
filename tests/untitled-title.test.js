import { test } from 'node:test'
import assert from 'node:assert/strict'
import { automaticNoteTitle, noteTitle, renderMarkdown } from '../src/markdown.js'
import { noteArticleHtml } from '../src/public-content.js'
import { rssXml } from '../src/feeds.js'

const quote = '> 如果銀行面臨的唯一懲罰是財務上的，罰款就只是經營成本之一。這積極激勵銀行確保他們如果縱容犯罪，必須以最有利可圖的方式進行。\n\n除了銀行，其他單位個體也適用。'
const note = {
  id: '20261122-be06a9ac93',
  slug: 'why-financial-fines-alone-fail-to-stop-bank-money-laundering',
  title: null,
  bookmark_id: null,
  markdown: quote,
  tags: [],
  created_at: '2026-11-22T21:11:36.285Z',
  published_at: '2026-11-22T21:11:36.285Z',
  updated_at: '2026-11-22T21:11:36.285Z',
}

test('untitled note derives short first sentence without changing Markdown', () => {
  const heading = '如果銀行面臨的唯一懲罰是財務上的，罰款就只是經營成本之一'
  assert.equal(automaticNoteTitle(quote), heading)
  assert.equal(noteTitle(note), heading)
  assert.match(renderMarkdown(quote), /<\/blockquote>\s*<p>除了銀行，其他單位個體也適用。<\/p>/)
  assert.equal(note.markdown, quote)
})

test('untitled overflow truncates at a meaningful boundary and adds an ellipsis', () => {
  const long = '很長的句子需要合理的縮短但不能刪掉原文的內容'.repeat(4)
  assert.ok(Array.from(automaticNoteTitle(long)).length <= 39)
  assert.ok(automaticNoteTitle(long).endsWith('…'))
  assert.equal(noteTitle({ title: '我自己寫的長標題', markdown: long }), '我自己寫的長標題')
})

test('public HTML and RSS share the identical automatic title', () => {
  const title = noteTitle(note)
  const html = noteArticleHtml(note, 'https://christorng.idv.tw')
  const rss = rssXml([note], 'https://christorng.idv.tw')
  assert.ok(html.includes(title))
  assert.ok(rss.includes(title))
  assert.ok(rss.includes('除了銀行，其他單位個體也適用'))
})
