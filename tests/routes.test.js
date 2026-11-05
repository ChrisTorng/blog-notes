import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'
test('Worker serves no editor HTML and protects the admin data API', async () => {
  assert.equal(
    (await worker.fetch(new Request('https://example.org/notes/editor/'), {}))
      .status,
    404
  )
  assert.equal(
    (
      await worker.fetch(
        new Request('https://example.org/notes/api/admin/'),
        {}
      )
    ).status,
    401
  )
})
test('combined RSS fails explicitly rather than publishing a partial feed', async () => {
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            first: async () => ({ total: 0 }),
            all: async () => ({ results: [] }),
          }
        },
      }
    },
  }
  const response = await worker.fetch(
    new Request('https://example.org/notes/all/feed.xml'),
    { DB: db, BLOG_FEED_URL: 'http://127.0.0.1:1/unavailable' }
  )
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Retry-After'), '60')
})
