import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  editableSnapshot,
  historyGroups,
  historyLabel,
} from '../public/notes/editor-state.js'

test('unsaved-state comparison ignores tag order but detects text changes', () => {
  const a = { title: '標題', markdown: '原文', tags: ['ai', 'music'] }
  assert.equal(
    editableSnapshot(a),
    editableSnapshot({ ...a, tags: ['music', 'ai'] })
  )
  assert.notEqual(
    editableSnapshot(a),
    editableSnapshot({ ...a, markdown: '修改' })
  )
  assert.notEqual(
    editableSnapshot(a),
    editableSnapshot({ ...a, title: '另一標題' })
  )
})
test('history contains only grouped past items, newest timestamp first within each group', () => {
  const items = [
    {
      id: 'z',
      status: 'published',
      title: '早',
      markdown: '',
      created_at: '2026-01-01T01:00:00.000Z',
      published_at: '2026-01-01T01:00:00.000Z',
    },
    {
      id: 'a',
      status: 'published',
      title: '晚',
      markdown: '',
      created_at: '2026-01-01T12:00:00.000Z',
      published_at: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'draft',
      status: 'draft',
      title: '草稿',
      markdown: '',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T14:00:00.000Z',
    },
  ]
  const groups = historyGroups(items)
  assert.deepEqual(
    groups.map((group) => group.label),
    ['草稿', '已發佈']
  )
  assert.deepEqual(
    groups[1].items.map((item) => item.id),
    ['a', 'z']
  )
  assert.equal(
    groups.reduce((n, group) => n + group.items.length, 0),
    items.length
  )
  assert.match(historyLabel(items[0]), /^2026-01-01 09:00:00\s+早$/)
})
