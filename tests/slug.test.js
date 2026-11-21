import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, ensureSlug, englishSlug, translatedNoteSlug } from '../src/slug.js';

test('English article titles become short lowercase permanent URL slugs', () => {
  assert.equal(slugify('The Future of AI Agents'), 'the-future-of-ai-agents');
  assert.equal(slugify("C# / .NET: What's New?"), 'c-net-what-s-new');
  assert.equal(slugify(' '), 'entry');
});

test('Traditional Chinese uses tone-free Hanyu Pinyin, with phrase disambiguation', () => {
  assert.equal(slugify('人工智慧的未來'), 'ren-gong-zhi-hui-de-wei-lai');
  assert.equal(slugify('我的學習心得'), 'wo-de-xue-xi-xin-de');
  assert.equal(slugify('銀行'), 'yin-hang');
});

test('slug suffixes resolve uniqueness and URLs stay stable on edits', async () => {
  const storage = new Map([['a',null],['b',null],['c',null]]);
  const bySlug = new Map();
  const db = {prepare(sql) { return {bind(...params) {return {
    async first() { return {slug:storage.get(params[0])}; },
    async run() {
      const [slug,id]=params;
      if (bySlug.has(slug)) throw Error('UNIQUE constraint failed: bookmarks.slug');
      if (storage.get(id)) return {meta:{changes:0}};
      storage.set(id,slug);bySlug.set(slug,id);return {meta:{changes:1}};
    },
  }}}}};
  assert.equal(await ensureSlug(db,'bookmarks','a','Same title'), 'same-title');
  assert.equal(await ensureSlug(db,'bookmarks','b','Same title'), 'same-title-2');
  assert.equal(await ensureSlug(db,'bookmarks','c','Same title'), 'same-title-3');
  assert.equal(await ensureSlug(db,'bookmarks','a','Changed title'), 'same-title');
});

test('Chinese note titles are semantically translated to English, never Pinyin', async () => {
  let calls=0;
  const ai={async run(model, input) {
    calls++;
    assert.equal(model,'@cf/google/gemma-4-26b-a4b-it');
    assert.match(input.messages[1].content,/憑證/);
    return {choices:[{message:{content:'Using an eMudhra Certificate as a Key Step in Hardware Hacking'}}]};
  }};
  assert.equal(await translatedNoteSlug('eMudhra 憑證可以利用來建立自己的硬體破解之關鍵步驟之一',ai),
    'using-an-emudhra-certificate-as-a-key-step-in-hardware-hacking');
  assert.equal(calls,1);
  assert.equal(await translatedNoteSlug('Microsoft 365 Outage Lasted All Day',ai),'microsoft-365-outage-lasted-all-day');
  assert.equal(calls,1);
  assert.equal(englishSlug('Café de l’été'),'cafe-de-l-ete');
  await assert.rejects(translatedNoteSlug('中文標題',null),/Workers AI/);
});
