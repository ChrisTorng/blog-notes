import test from 'node:test';
import assert from 'node:assert/strict';
import {rssPreviewHtml} from '../src/feeds.js';
test('only explicitly marked bookmark preview becomes an absolute JPEG RSS URL',()=>{
 const path='/bookmarks/rss-image/12345678-1234-1234-1234-123456789abc/12345678.jpg';
 const origin='https://example.com';
 const html='<img src="https://example.net/preview.webp" data-rss-preview="'+path+'" loading="lazy" decoding="async"><img src="https://example.net/favicon.ico"><img src="https://example.net/note.webp">';
 const output=rssPreviewHtml(html,origin);
 assert.equal(output,'<img src="'+origin+path+'"><img src="https://example.net/favicon.ico"><img src="https://example.net/note.webp">');
 assert.equal(rssPreviewHtml(output,origin),output);
});
