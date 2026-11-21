import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.js'

test('public Notes list and individual articles route to the isolated cache',async()=>{
  const paths=[]
  const ctx={exports:{PublicCache:{async fetch(req){
    paths.push(new URL(req.url).pathname)
    assert.equal(req.headers.get('Authorization'),null)
    return new Response('<article>隨筆全文</article>',{
      headers:{'Content-Type':'text/html; charset=utf-8'}
    })
  }}}}
  for(const path of ['/notes/','/notes/using-english-title/','/notes/feed.xml']) {
    const res=await worker.fetch(new Request('https://christorng.idv.tw'+path,{
      headers:{Authorization:'Bearer admin-only'}
    }),{AUTH_MODE:'access'},ctx)
    assert.equal(res.status,200)
  }
  assert.deepEqual(paths,['/notes/','/notes/using-english-title/','/notes/feed.xml'])
})

test('Notes session and admin requests bypass cached public content',async()=>{
  let calls=0
  const ctx={exports:{PublicCache:{async fetch(){calls++;return new Response('leak')}}}}
  const env={AUTH_MODE:'local'}
  const res=await worker.fetch(new Request('https://christorng.idv.tw/notes/api/tags'),env,ctx)
  assert.equal(res.status,200)
  assert.equal(calls,0)
  const tags=await res.json()
  assert.ok(Array.isArray(tags))
})
