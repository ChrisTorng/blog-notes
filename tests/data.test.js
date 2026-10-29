import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { checkNoteInput, cleanTags, pageNumber } from '../src/data.js'

test('validated tags share the Blog IDs and remove duplicates', () => {
  assert.deepEqual(cleanTags(['ai', 'music', 'ai']), ['ai', 'music'])
  assert.throws(() => cleanTags(['unknown']))
})
test('markdown remains stored as original Markdown with status', () => {
  const note = checkNoteInput({
    markdown: '**粗體**\n\n[連結](https://example.org)',
    status: 'published',
    tags: ['ai'],
  })
  assert.equal(note.markdown, '**粗體**\n\n[連結](https://example.org)')
  assert.equal(note.status, 'published')
})
test('rejects unsupported statuses and overly long content', () => {
  assert.throws(() => checkNoteInput({ markdown: 'X', status: 'deleted' }))
  assert.throws(() => checkNoteInput({ markdown: 'X'.repeat(30001) }))
})
test('page number bounds', () => {
  assert.equal(pageNumber('2'), 2)
  assert.equal(pageNumber('-9'), 1)
  assert.equal(pageNumber('Infinity'), 1)
  assert.equal(pageNumber('abc'), 1)
})

test('content and title limits accept their exact boundary and reject longer input', () => {
  const valid = checkNoteInput({
    markdown: '文'.repeat(30000),
    title: '題'.repeat(160),
  })
  assert.equal(valid.markdown.length, 30000)
  assert.equal(valid.title.length, 160)
  assert.throws(() => checkNoteInput({ markdown: '文'.repeat(30001) }))
  assert.throws(() =>
    checkNoteInput({ markdown: '文', title: '題'.repeat(161) })
  )
})
