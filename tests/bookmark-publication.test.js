import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePublishedBookmark } from '../src/bookmark-publication.js';

const id = '439e6a51-9c83-417b-aa1c-d0d1b02c973c';
const note = { title: '隨筆', markdown: '文章內容', bookmark_id: id, tags: [] };

test('publishing a note promotes its referenced bookmark first', async () => {
  const calls = [];
  await ensurePublishedBookmark({
    BOOKMARK_EDITOR: { recommendForPublishedNote: async ref => {
      calls.push(ref);
      return { id: ref, status: 4 };
    } },
  }, { ...note, status: 'published' });
  assert.deepEqual(calls, [id]);
});

test('saving a draft or a published note without a reference does not touch bookmarks', async () => {
  const env = { BOOKMARK_EDITOR: { recommendForPublishedNote: () => { throw Error('unexpected') } } };
  await ensurePublishedBookmark(env, { ...note, status: 'draft' });
  await ensurePublishedBookmark(env, { ...note, bookmark_id: null, status: 'published' });
});

test('invalid note contents and failed reference publication prevent publication', async () => {
  let called = false;
  const env = { BOOKMARK_EDITOR: { recommendForPublishedNote: async () => {
    called = true;
    throw Error('引用書籤缺少分類');
  } } };
  await assert.rejects(() => ensurePublishedBookmark(env, {
    ...note, markdown: '', status: 'published',
  }), /Markdown/);
  assert.equal(called, false);
  await assert.rejects(() => ensurePublishedBookmark(env, {
    ...note, status: 'published',
  }), /缺少分類/);
});
