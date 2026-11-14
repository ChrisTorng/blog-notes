import { allTags } from './data.js';
import { htmlEscape as esc, notePath, noteTitle, renderPublicMarkdown } from './markdown.js';

const names = new Map(allTags.map(t=>[t.id,t.displayName]));

export const displayTag = id => names.get(id)||id;

// Canonical full-content HTML shared by the public note page and both RSS feeds.
export function noteArticleHtml(note,siteUrl,bookmarkHtml='',{asReference=false}={}) {
  const date=(note.published_at||note.created_at).slice(0,10);
  const tags=note.tags.map(id=>
    '<a class="text-primary-500" href="'+esc(siteUrl)+'/notes/?tag='+encodeURIComponent(id)+'">#'+
      esc(displayTag(id))+'</a>').join('');
  const bookmark=!asReference && note.bookmark_id
    ? '<aside class="mt-3 min-w-0 rounded-r-lg border-l-4 border-primary-500 bg-gray-50/60 px-3 py-2 dark:bg-gray-800/40" aria-label="引用書籤">'+
      (bookmarkHtml || '<p class="text-sm">引用書籤：<a class="text-primary-500" href="/bookmarks/view/?id='+
        encodeURIComponent(note.bookmark_id)+'">查看目前內容</a></p>')+'</aside>' : '';
  const markdown=renderPublicMarkdown(note.markdown,siteUrl);
  const title=esc(noteTitle(note));
  const heading=asReference
    ? '<h2 class="mt-2 text-xl leading-snug font-bold"><a class="text-primary-500" href="'+
      esc(siteUrl+notePath(note))+'">'+title+'</a></h2>'
    : '<h1 class="mt-2 text-xl leading-snug font-bold">'+title+'</h1>';
  return '<article class="border-b border-gray-300/40 py-4 dark:border-gray-700">'+
    '<time class="text-xs text-gray-500" datetime="'+esc(date)+'">'+esc(date)+'</time>'+
    heading+
    bookmark+'<div class="mt-3 prose max-w-none text-sm dark:prose-invert">'+markdown+'</div>'+
    '<div class="mt-3 flex flex-wrap gap-2 text-sm">'+tags+'</div></article>';
}
