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

test('legacy note slug permanently redirects to the new English canonical slug',async()=>{
  const db={prepare(sql){return {bind(){return {async first(){
    if(!sql.includes('note_slug_redirects'))return null;
    return {id:'20261116-de30a1b21e',slug:'using-an-emudhra-certificate',
      title:null,markdown:'eMudhra 憑證',status:'published',tags:'[]',
      created_at:'2026-11-16T00:00:00Z',published_at:'2026-11-16T00:00:00Z'};
  }}}}}};
  const result=await worker.fetch(new Request('https://example.org/notes/emudhra-ping-zheng/'),{DB:db});
  assert.equal(result.status,308);
  assert.equal(result.headers.get('location'),'https://example.org/notes/using-an-emudhra-certificate/');
});
