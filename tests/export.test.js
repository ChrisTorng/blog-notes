import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync, strFromU8 } from 'fflate'
import { notesExport, noteMarkdown } from '../src/export.js'
import worker from '../src/index.js'

const notes = Array.from({ length: 135 }, (_, i) => ({
  id: '20261028-' + i.toString(16).padStart(10, '0'),
  title: i === 0 ? null : '測試 "標題" : ' + i,
  markdown: '# 原始 Markdown\r\n\r\n> 保留 **粗體** 與 <字元>\r\n',
  tags: ['ai'],
  status: i % 2 ? 'draft' : 'published',
  created_at: '2026-10-28T01:00:00.000Z',
  updated_at: '2026-10-28T02:00:00.000Z',
  published_at: i % 2 ? null : '2026-10-28T01:00:00.000Z',
}))
function database() {
  let queries = 0
  return {
    get queries() {
      return queries
    },
    prepare(sql) {
      assert.match(sql, /WHERE n.id > \? ORDER BY n.id LIMIT 100/)
      return {
        bind(after) {
          return {
            async all() {
              queries++
              return {
                results: notes
                  .filter((n) => n.id > after)
                  .slice(0, 100)
                  .map((n) => ({ ...n, tags: JSON.stringify(n.tags) })),
              }
            },
          }
        },
      }
    },
  }
}
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]+?)\n---\n/)
  const fields = Object.fromEntries(
    match[1].split('\n').map((line) => {
      const split = line.indexOf(':')
      return [line.slice(0, split), JSON.parse(line.slice(split + 1))]
    })
  )
  return { fields, body: text.slice(match[0].length) }
}
test('Markdown export uses blog frontmatter and preserves original Markdown exactly', () => {
  for (const note of notes.slice(0, 2)) {
    const { fields, body } = parseFrontmatter(noteMarkdown(note))
    assert.equal(body, note.markdown)
    assert.equal(typeof fields.title, 'string')
    assert.ok(!('note_title' in fields))
    assert.ok(!('note_status' in fields))
    assert.ok(!('summary' in fields))
    assert.equal(fields.draft, note.status === 'draft')
    assert.deepEqual(fields.tags, ['AI'])
    assert.equal(fields.lastmod, note.updated_at)
    assert.equal(fields.date, note.published_at || note.created_at)
    assert.equal(fields.published_at, note.published_at)
  }
})
test('ZIP streams all published and draft notes across database batches as one MD each', async () => {
  const db = database(),
    response = notesExport(db)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.match(
    response.headers.get('Content-Disposition'),
    /notes-export-.*\.zip/
  )
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
  assert.equal(Object.keys(files).length, 135)
  assert.ok(db.queries >= 3)
  for (const note of notes) {
    const { fields, body } = parseFrontmatter(strFromU8(files[note.id + '.md']))
    assert.equal(fields.note_id, note.id)
    assert.equal(fields.draft, note.status === 'draft')
    assert.equal(body, note.markdown)
  }
})
test('export rejects anonymous access and forged Access cookies before reading the database', async () => {
  const db = database()
  for (const headers of [{}, { Cookie: 'CF_Authorization=forged' }]) {
    const response = await worker.fetch(
      new Request('http://localhost/notes/api/admin/export', { headers }),
      { DB: db }
    )
    assert.equal(response.status, 401)
  }
  assert.equal(db.queries, 0)
})
